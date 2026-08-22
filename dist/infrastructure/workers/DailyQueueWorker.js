"use strict";
/**
 * src/infrastructure/workers/DailyQueueWorker.ts
 *
 * BullMQ Worker implementation for processing daily morning review compilation.
 * Instantiates dependencies (Prisma Repositories, Resend Provider, Engine) and runs compilation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeWorker = exports.createDailyQueueWorker = void 0;
const bullmq_1 = require("bullmq");
const queueSetup_1 = require("./queueSetup");
const prismaClient_1 = require("../database/prismaClient");
const PrismaProblemProgressRepository_1 = require("../repositories/PrismaProblemProgressRepository");
const PrismaProblemRepository_1 = require("../repositories/PrismaProblemRepository");
const PrismaUserRepository_1 = require("../repositories/PrismaUserRepository");
const ResendNotificationProvider_1 = require("../external/ResendNotificationProvider");
const QueueCompilationEngine_1 = require("../../application/use-cases/QueueCompilationEngine");
const logger_1 = require("../../shared/utils/logger");
const masteryLookup_1 = require("./masteryLookup");
let workerInstance = null;
/**
 * Creates and starts the BullMQ daily review worker process.
 */
const createDailyQueueWorker = () => {
    if (workerInstance) {
        return workerInstance;
    }
    // BullMQ Workers need their own Redis connection (separate from the Queue's)
    // to avoid blocking-command head-of-line contention. See PERFORMANCE.md M8.
    const connection = (0, queueSetup_1.getWorkerConnection)();
    logger_1.logger.info(`[DailyQueueWorker] Starting BullMQ worker listening on "${queueSetup_1.QUEUE_NAME}"...`);
    workerInstance = new bullmq_1.Worker(queueSetup_1.QUEUE_NAME, async (job) => {
        logger_1.logger.info(`[DailyQueueWorker] Processing job ${job.id} (name: ${job.name})...`);
        // 1. Instantiate repositories and external services
        const progressRepo = new PrismaProblemProgressRepository_1.PrismaProblemProgressRepository(prismaClient_1.prisma);
        const problemRepo = new PrismaProblemRepository_1.PrismaProblemRepository(prismaClient_1.prisma);
        const userRepo = new PrismaUserRepository_1.PrismaUserRepository(prismaClient_1.prisma);
        const notificationProvider = new ResendNotificationProvider_1.ResendNotificationProvider();
        // 2. Instantiate QueueCompilationEngine
        const engine = new QueueCompilationEngine_1.QueueCompilationEngine({
            progressRepository: progressRepo,
            problemRepository: problemRepo,
            userRepository: userRepo,
            notificationProvider,
            masteryLookup: (0, masteryLookup_1.createMasteryLookup)(prismaClient_1.prisma),
        });
        // 3. Execute daily queue compilation
        const result = await engine.execute();
        logger_1.logger.info(`[DailyQueueWorker] Job ${job.id} executed successfully. ` +
            `Users processed: ${result.usersProcessed}, items: ${result.totalItemsDispatched}, failures: ${result.failures.length}`);
        return result;
    }, {
        connection,
        concurrency: 1, // Process one daily run job at a time
    });
    // Event listeners
    workerInstance.on('completed', (job, result) => {
        logger_1.logger.info(`[DailyQueueWorker] Job ${job.id} completed. Summary: ${JSON.stringify(result)}`);
    });
    workerInstance.on('failed', (job, err) => {
        logger_1.logger.error(`[DailyQueueWorker] Job ${job?.id} failed: ${err.message}`, { stack: err.stack });
    });
    workerInstance.on('error', (err) => {
        logger_1.logger.error(`[DailyQueueWorker] Internal worker error: ${err.message}`, { stack: err.stack });
    });
    return workerInstance;
};
exports.createDailyQueueWorker = createDailyQueueWorker;
/**
 * Gracefully shuts down the worker.
 */
const closeWorker = async () => {
    if (workerInstance) {
        logger_1.logger.info('[DailyQueueWorker] Shutting down worker...');
        await workerInstance.close();
        workerInstance = null;
        logger_1.logger.info('[DailyQueueWorker] Worker closed gracefully.');
    }
};
exports.closeWorker = closeWorker;
//# sourceMappingURL=DailyQueueWorker.js.map