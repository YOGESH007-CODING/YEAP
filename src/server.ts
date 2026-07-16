/**
 * src/server.ts
 *
 * Application bootstrapper and HTTP server listener.
 * Loads environment and starts the Express API.
 */

import 'dotenv/config';
import { createApp } from './app';
import { disconnectPrisma } from './infrastructure/database/prismaClient';
// Redis/BullMQ worker support is disabled for the Vercel deployment.
// import { verifyRedisConnection } from './infrastructure/workers/queueSetup';
import { logger } from './shared/utils/logger';

const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

const startServer = async (): Promise<void> => {
  // Redis/BullMQ startup verification is disabled. The API does not require Redis.
  // await verifyRedisConnection();

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
