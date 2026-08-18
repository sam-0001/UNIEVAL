import express, { Request, Response } from 'express';
import logger from '../logger.js';

const router = express.Router();

// Define your custom Verify Token here (must match the one you put in the Meta dashboard)
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'unieval_webhook_secret_2026';

// ── Webhook Verification (GET) ────────────────────────────────────────────────
// Meta sends a GET request to verify the webhook URL.
router.get('/webhook', (req: Request, res: Response) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('WhatsApp Webhook verified successfully!');
      // Respond with the challenge token from the request
      res.status(200).send(challenge);
    } else {
      logger.warn('WhatsApp Webhook verification failed. Tokens do not match.');
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// ── Webhook Event Handler (POST) ──────────────────────────────────────────────
// Meta sends POST requests when new WhatsApp events occur (e.g., messages, statuses)
router.post('/webhook', (req: Request, res: Response) => {
  const body = req.body;

  // Check if this is an event from a WhatsApp API
  if (body.object === 'whatsapp_business_account') {
    // Return a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');

    // Process the event in the background (to avoid timeouts)
    try {
      body.entry?.forEach((entry: any) => {
        const changes = entry.changes;
        changes?.forEach((change: any) => {
          if (change.value?.messages) {
            const message = change.value.messages[0];
            const sender = message.from;
            logger.info(`Received WhatsApp message from ${sender}:`, message);
            // TODO: Add logic to process incoming messages here
          } else if (change.value?.statuses) {
            const status = change.value.statuses[0];
            logger.info(`Received WhatsApp status update:`, status);
            // TODO: Add logic to process status updates (delivered, read, etc.)
          }
        });
      });
    } catch (error) {
      logger.error('Error processing WhatsApp webhook event:', error);
    }
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    res.sendStatus(404);
  }
});

export default router;
