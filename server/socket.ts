import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import logger from './logger.js';
import { redis } from './redis.js';

export const initSocket = (server: HttpServer) => {
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Adjust for production
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a live class room
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      socket.join(roomId);
      // Store user session mapping if needed
      logger.info(`User ${userName} (${userId}) joined room ${roomId}`);

      // Broadcast to room
      socket.to(roomId).emit('user-joined', { userId, userName });

      // Handle chat message
      socket.on('chat-message', (data) => {
        io.to(roomId).emit('chat-message', { ...data, userId, userName });
      });

      // Handle hand raise
      socket.on('raise-hand', () => {
        io.to(roomId).emit('hand-raised', { userId, userName });
      });

      socket.on('disconnect', () => {
        logger.info(`User ${userName} disconnected from room ${roomId}`);
        socket.to(roomId).emit('user-left', { userId, userName });
        
        // Clean up anti-piracy session in redis
        if (redis) {
          redis.del(`liveclass:${roomId}:user:${userId}`);
        }
      });
    });
  });

  return io;
};
