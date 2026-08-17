import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from './logger.js';
import { redis } from './redis.js';
import { LiveChat, LiveQuestion, LivePoll, LivePollResponse } from './models.js';

export const initSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Store per-socket context so all handlers below can access it
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;
    let currentUserName: string = 'Unknown';

    // ─── Join Room ────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      if (currentRoomId) {
        // Leave previous room if re-joining (e.g. reconnect)
        socket.leave(currentRoomId);
      }

      currentRoomId = roomId;
      currentUserId = userId;
      currentUserName = userName;

      socket.join(roomId);
      logger.info(`User ${userName} (${userId}) joined room ${roomId}`);

      // Anti-Piracy: kick previous session for the same user
      if (redis) {
        const existingSocketId = await redis.get(`liveclass:${roomId}:user:${userId}`);
        if (existingSocketId && existingSocketId !== socket.id) {
          logger.info(`Kicking old session ${existingSocketId} for user ${userId}`);
          io.to(existingSocketId).emit('force-disconnect', { reason: 'concurrent_login' });
        }
        await redis.setex(`liveclass:${roomId}:user:${userId}`, 3600, socket.id);
      }

      // Notify others
      socket.to(roomId).emit('user-joined', { userId, userName });

      // Send history to the joining socket
      try {
        const [chats, questions, polls] = await Promise.all([
          LiveChat.find({ classId: roomId }).sort({ timestamp: 1 }).limit(200).lean(),
          LiveQuestion.find({ classId: roomId }).sort({ timestamp: 1 }).limit(100).lean(),
          LivePoll.find({ classId: roomId }).sort({ createdAt: -1 }).limit(10).lean(),
        ]);

        if (chats.length > 0) socket.emit('chat-history', chats);
        if (questions.length > 0) socket.emit('qa-history', questions);

        const activePoll = polls.find((p: any) => p.status === 'active') || polls[0] || null;
        if (activePoll) {
          socket.emit('poll-start', activePoll);
          const pollResponses = await LivePollResponse.find({ pollId: activePoll.id }).lean();
          if (pollResponses.length > 0) socket.emit('poll-history', pollResponses);
        }
      } catch (err) {
        logger.error('Error sending room history', err);
      }
    });

    // ─── Chat ─────────────────────────────────────────────────────────────────
    socket.on('chat-message', async (data) => {
      if (!currentRoomId || !currentUserId) return;
      try {
        const timestamp = new Date();
        await LiveChat.create({
          id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
          classId: currentRoomId,
          senderId: currentUserId,
          senderName: currentUserName,
          text: data.text,
          timestamp,
        });
        io.to(currentRoomId).emit('chat-message', {
          text: data.text,
          userId: currentUserId,
          userName: currentUserName,
          timestamp,
        });
      } catch (err) {
        logger.error('Error saving chat message', err);
      }
    });

    // ─── Q&A ──────────────────────────────────────────────────────────────────
    socket.on('new-question', async (data) => {
      if (!currentRoomId || !currentUserId) return;
      try {
        const uniqueId = `q-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const timestamp = new Date();
        await LiveQuestion.create({
          id: uniqueId,
          classId: currentRoomId,
          studentId: currentUserId,
          studentName: currentUserName,
          content: data.content,
          upvotes: [],
          isAnswered: false,
          timestamp,
        });
        io.to(currentRoomId).emit('new-question', {
          id: uniqueId,
          content: data.content,
          studentId: currentUserId,
          studentName: currentUserName,
          upvotes: [],
          isAnswered: false,
          timestamp,
        });
        logger.info(`New question in room ${currentRoomId}: ${data.content}`);
      } catch (err) {
        logger.error('Error creating question', err);
      }
    });

    socket.on('upvote-question', async (data) => {
      if (!currentRoomId || !currentUserId) return;
      try {
        const question = await LiveQuestion.findOne({ id: data.id });
        if (question) {
          const idx = question.upvotes.indexOf(currentUserId);
          if (idx > -1) {
            question.upvotes.splice(idx, 1);
          } else {
            question.upvotes.push(currentUserId);
          }
          await question.save();
          io.to(currentRoomId).emit('upvote-question', { id: data.id, upvotes: question.upvotes });
        }
      } catch (err) {
        logger.error('Error upvoting question', err);
      }
    });

    // ─── Polls ────────────────────────────────────────────────────────────────
    socket.on('poll-start', async (data) => {
      if (!currentRoomId) return;
      try {
        const uniqueId = `p-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const poll = {
          id: uniqueId,
          classId: currentRoomId,
          question: data.question,
          options: data.options,
          correctOptionId: data.correctOptionId,
          status: 'active' as const,
        };
        await LivePoll.create(poll);
        io.to(currentRoomId).emit('poll-start', poll);
        logger.info(`Poll started in room ${currentRoomId}: ${data.question}`);
      } catch (err) {
        logger.error('Error starting poll', err);
      }
    });

    socket.on('poll-answer', async (data) => {
      if (!currentRoomId || !currentUserId) return;
      try {
        const uniqueId = `pa-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        await LivePollResponse.create({
          id: uniqueId,
          pollId: data.pollId,
          studentId: currentUserId,
          studentName: currentUserName,
          selectedOptionId: data.selectedOptionId,
          responseTime: data.responseTime || 0,
        });
        io.to(currentRoomId).emit('poll-answer', {
          id: uniqueId,
          pollId: data.pollId,
          studentId: currentUserId,
          studentName: currentUserName,
          selectedOptionId: data.selectedOptionId,
          responseTime: data.responseTime || 0,
        });
      } catch (err) {
        logger.error('Error saving poll answer', err);
      }
    });

    socket.on('poll-end', async (data) => {
      if (!currentRoomId) return;
      try {
        await LivePoll.findOneAndUpdate({ id: data.id }, { status: 'closed' });
        io.to(currentRoomId).emit('poll-end', { id: data.id });
        logger.info(`Poll ended in room ${currentRoomId}`);
      } catch (err) {
        logger.error('Error ending poll', err);
      }
    });

    // ─── Raise Hand ───────────────────────────────────────────────────────────
    socket.on('raise-hand', () => {
      if (!currentRoomId) return;
      io.to(currentRoomId).emit('hand-raised', { userId: currentUserId, userName: currentUserName });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id} (user: ${currentUserName})`);
      if (currentRoomId) {
        socket.to(currentRoomId).emit('user-left', { userId: currentUserId, userName: currentUserName });
        if (redis && currentUserId) {
          redis.del(`liveclass:${currentRoomId}:user:${currentUserId}`);
        }
      }
    });
  });

  return io;
};
