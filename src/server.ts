/**
 * src/server.ts
 *
 * Application bootstrapper and HTTP server listener.
 * Loads environment and starts Express API (and optional persistent BullMQ worker).
 */

import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first if it exists, otherwise fall back to .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { createApp } from './app';
import { disconnectPrisma } from './infrastructure/database/prismaClient';
import { verifyRedisConnection, registerDailyJob, closeQueue } from './infrastructure/workers/queueSetup';
import { createDailyQueueWorker, closeWorker } from './infrastructure/workers/DailyQueueWorker';
import { logger } from './shared/utils/logger';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const ENABLE_WORKER = process.env['ENABLE_WORKER'] === 'true';

const startServer = async (): Promise<void> => {
  // If persistent worker mode is explicitly enabled (e.g. Railway / Render / Fly.io)
  if (ENABLE_WORKER) {
    logger.info('[Worker] ENABLE_WORKER=true. Initializing BullMQ Worker & Redis connection...');
    await verifyRedisConnection();
    await registerDailyJob();
    createDailyQueueWorker();
  } else {
    logger.info('[Server] ENABLE_WORKER=false (Vercel mode). Worker and Redis scheduler disabled.');
  }

  const app = createApp();

  const server = app.listen(PORT, () => {
    logger.info(`🚀 YEAP SRS Server running on http://localhost:${PORT}`);
    logger.info(`📋 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
    logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`[Server] Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      if (ENABLE_WORKER) {
        await closeWorker();
        await closeQueue();
      }
      await disconnectPrisma();
      logger.info('[Server] Server closed. Goodbye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
  process.on('SIGINT', () => { void shutdown('SIGINT'); });

  process.on('unhandledRejection', (reason) => {
    logger.error('[Server] Unhandled Promise Rejection:', { reason });
  });

  process.on('uncaughtException', (error) => {
    logger.error(`[Server] Uncaught Exception: ${error.message}`, { stack: error.stack });
    process.exit(1);
  });
};

startServer().catch((error: Error) => {
  logger.error(`[Server] Fatal startup error: ${error.message}`);
  process.exit(1);
});
