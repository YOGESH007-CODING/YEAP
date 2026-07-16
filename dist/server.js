"use strict";
/**
 * src/server.ts
 *
 * Application bootstrapper and HTTP server listener.
 * Loads environment and starts the Express API.
 */
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const prismaClient_1 = require("./infrastructure/database/prismaClient");
// Redis/BullMQ worker support is disabled for the Vercel deployment.
// import { verifyRedisConnection } from './infrastructure/workers/queueSetup';
const logger_1 = require("./shared/utils/logger");
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const startServer = async () => {
    // Redis/BullMQ startup verification is disabled. The API does not require Redis.
    // await verifyRedisConnection();
    const app = (0, app_1.createApp)();
    const server = app.listen(PORT, () => {
        logger_1.logger.info(`🚀 YEAP SRS Server running on http://localhost:${PORT}`);
        logger_1.logger.info(`📋 Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
        logger_1.logger.info(`❤️  Health check: http://localhost:${PORT}/health`);
    });
    // ── Graceful Shutdown ────────────────────────────────────────────────
    const shutdown = async (signal) => {
        logger_1.logger.info(`[Server] Received ${signal}. Shutting down gracefully...`);
        server.close(async () => {
            await (0, prismaClient_1.disconnectPrisma)();
            logger_1.logger.info('[Server] Server closed. Goodbye!');
            process.exit(0);
        });
    };
    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    process.on('SIGINT', () => { void shutdown('SIGINT'); });
    process.on('unhandledRejection', (reason) => {
        logger_1.logger.error('[Server] Unhandled Promise Rejection:', { reason });
    });
    process.on('uncaughtException', (error) => {
        logger_1.logger.error(`[Server] Uncaught Exception: ${error.message}`, { stack: error.stack });
        process.exit(1);
    });
};
startServer().catch((error) => {
    logger_1.logger.error(`[Server] Fatal startup error: ${error.message}`);
    process.exit(1);
});
//# sourceMappingURL=server.js.map