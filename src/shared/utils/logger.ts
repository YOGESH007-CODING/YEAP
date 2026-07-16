/**
 * src/shared/utils/logger.ts
 *
 * Application-wide logger using Winston.
 * Provides structured JSON logging in production, colorized output in development.
 */

import winston from 'winston';

const { combine, timestamp, colorize, printf, json, errors } = winston.format;

// ─── Console format (development) ────────────────────────────────────────────

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack }) => {
    return stack
      ? `${ts} [${level}] ${message}\n${stack}`
      : `${ts} [${level}] ${message}`;
  }),
);

// ─── JSON format (production) ─────────────────────────────────────────────────

const prodFormat = combine(
  timestamp(),
  errors({ stack: true }),
  json(),
);

// ─── Logger Instance ──────────────────────────────────────────────────────────

const isProd = process.env['NODE_ENV'] === 'production';

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    // Add file transport for production if needed:
    // new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

// ─── Convenience re-exports ───────────────────────────────────────────────────

export type Logger = typeof logger;
