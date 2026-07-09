/**
 * server/logger.ts
 * Structured logger using Winston. Use this everywhere instead of console.log/error.
 *
 * Usage:
 *   import logger from '../logger.js';
 *   logger.info('User logged in', { userId: '...' });
 *   logger.error('Payment failed', { error: err.message, userId });
 *   logger.warn('[Redis] Not available');
 */
import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),

    format: isProduction
        // Production: JSON logs — easy to parse with Datadog, CloudWatch, etc.
        ? combine(timestamp(), errors({ stack: true }), json())
        // Development: colored, human-readable
        : combine(colorize(), timestamp({ format: 'HH:mm:ss' }), errors({ stack: true }), simple()),

    transports: [
        new winston.transports.Console(),
    ],
});

// In production, also write errors to a file so PM2 captures them separately
if (isProduction) {
    logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
    }));
    logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 20 * 1024 * 1024,
        maxFiles: 5,
        tailable: true,
    }));
}

export default logger;
