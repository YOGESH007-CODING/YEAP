"use strict";
/**
 * src/server.ts
 *
 * Application bootstrapper and HTTP server listener.
 * Loads environment and starts Express API (and optional persistent BullMQ worker).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load .env.local first if it exists, otherwise fall back to .env
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
const app_1 = require("./app");
const prismaClient_1 = require("./infrastructure/database/prismaClient");
const queueSetup_1 = require("./infrastructure/workers/queueSetup");
const DailyQueueWorker_1 = require("./infrastructure/workers/DailyQueueWorker");
const logger_1 = require("./shared/utils/logger");
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);
const ENABLE_WORKER = process.env['ENABLE_WORKER'] === 'true';
const startServer = async () => {
    // If persistent worker mode is explicitly enabled (e.g. Railway / Render / Fly.io)
    if (ENABLE_WORKER) {
        logger_1.logger.info('[Worker] ENABLE_WORKER=true. Initializing BullMQ Worker & Redis connection...');
        await (0, queueSetup_1.verifyRedisConnection)();
        await (0, queueSetup_1.registerDailyJob)();
        (0, DailyQueueWorker_1.createDailyQueueWorker)();
    }
    else {
        logger_1.logger.info('[Server] ENABLE_WORKER=false (Vercel mode). Worker and Redis scheduler disabled.');
    }
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
            if (ENABLE_WORKER) {
                await (0, DailyQueueWorker_1.closeWorker)();
                await (0, queueSetup_1.closeQueue)();
            }
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