"use strict";
/**
 * src/infrastructure/workers/DailyQueueWorker.ts
 *
 * Active BullMQ worker that processes the daily morning compilation job.
 * Triggered by a cron scheduler at 4:00 AM UTC via node-cron.
 *
 * Responsibilities:
 *   1. Listen for COMPILE_AND_DISPATCH jobs on the daily-review-queue
 *   2. Invoke QueueCompilationEngine to pull, cap, and dispatch review bundles
 *   3. Schedule the cron trigger (if run as standalone process)
 *
 * This file can be run standalone: npx ts-node src/infrastructure/workers/DailyQueueWorker.ts
 * It is intentionally a separate process from the HTTP server.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduleDailyRun = exports.worker = exports.queue = void 0;
require("dotenv/config");
const node_cron_1 = __importDefault(require("node-cron"));
const queueSetup_1 = require("./queueSetup");
const QueueCompilationEngine_1 = require("../../application/use-cases/QueueCompilationEngine");
const prismaClient_1 = require("../database/prismaClient");
const PrismaProblemProgressRepository_1 = require("../repositories/PrismaProblemProgressRepository");
const PrismaProblemRepository_1 = require("../repositories/PrismaProblemRepository");
const PrismaUserRepository_1 = require("../repositories/PrismaUserRepository");
const ResendNotificationProvider_1 = require("../external/ResendNotificationProvider");
const logger_1 = require("../../shared/utils/logger");
// ─── Dependency Composition ───────────────────────────────────────────────────
const progressRepository = new PrismaProblemProgressRepository_1.PrismaProblemProgressRepository(prismaClient_1.prisma);
const userRepository = new PrismaUserRepository_1.PrismaUserRepository(prismaClient_1.prisma);
const problemRepository = new PrismaProblemRepository_1.PrismaProblemRepository(prismaClient_1.prisma);
const compilationEngine = new QueueCompilationEngine_1.QueueCompilationEngine({
    progressRepository,
    problemRepository,
    userRepository,
    notificationProvider: new ResendNotificationProvider_1.ResendNotificationProvider(),
});
// ─── Job Processor ────────────────────────────────────────────────────────────
const processCompileAndDispatch = async (job) => {
    logger_1.logger.info(`[DailyQueueWorker] Processing job ${job.id} ` +
        `(triggered by: ${job.data.triggeredBy}, at: ${job.data.triggeredAt})`);
    const result = await compilationEngine.execute();
    logger_1.logger.info(`[DailyQueueWorker] Job ${job.id} complete. ` +
        `Users: ${result.usersProcessed}, Items: ${result.totalItemsDispatched}, ` +
        `Failures: ${result.failures.length}`);
    if (result.failures.length > 0) {
        logger_1.logger.warn(`[DailyQueueWorker] Partial failures:\n` +
            result.failures.map((f) => `  - ${f.userId}: ${f.error}`).join('\n'));
    }
};
// ─── Worker Initialization ────────────────────────────────────────────────────
const queue = (0, queueSetup_1.createDailyReviewQueue)();
exports.queue = queue;
const worker = (0, queueSetup_1.createWorker)(queueSetup_1.QUEUE_NAMES.DAILY_REVIEW, processCompileAndDispatch);
exports.worker = worker;
// ─── Queue Event Logging ──────────────────────────────────────────────────────
const queueEvents = (0, queueSetup_1.createQueueEvents)(queueSetup_1.QUEUE_NAMES.DAILY_REVIEW);
queueEvents.on('completed', ({ jobId }) => {
    logger_1.logger.info(`[DailyQueueWorker] Job ${jobId} completed successfully.`);
});
queueEvents.on('failed', ({ jobId, failedReason }) => {
    logger_1.logger.error(`[DailyQueueWorker] Job ${jobId} failed: ${failedReason}`);
});
// ─── Cron Scheduler: 4:00 AM UTC Daily ───────────────────────────────────────
/**
 * Cron expression: "0 4 * * *" = 4:00 AM every day UTC
 * The job is enqueued to BullMQ rather than executed inline,
 * allowing the worker to handle retries and backpressure properly.
 */
const scheduleDailyRun = () => {
    node_cron_1.default.schedule('0 4 * * *', // 4:00 AM UTC
    async () => {
        logger_1.logger.info('[Cron] 4:00 AM UTC trigger — enqueuing daily compilation job...');
        try {
            const date = new Date().toISOString().slice(0, 10);
            await queue.add(queueSetup_1.JOB_NAMES.COMPILE_AND_DISPATCH, {
                triggeredAt: new Date().toISOString(),
                triggeredBy: 'cron',
            }, { jobId: `daily-${date}` });
            logger_1.logger.info('[Cron] Daily compilation job enqueued successfully.');
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[Cron] Failed to enqueue job: ${message}`);
        }
    }, {
        timezone: 'UTC',
        runOnInit: false,
    });
    logger_1.logger.info('[DailyQueueWorker] Cron scheduler initialized. Next run: 4:00 AM UTC.');
};
exports.scheduleDailyRun = scheduleDailyRun;
// ─── Worker Lifecycle Management ──────────────────────────────────────────────
worker.on('ready', () => {
    logger_1.logger.info('[DailyQueueWorker] Worker is ready and listening for jobs.');
});
worker.on('error', (error) => {
    logger_1.logger.error(`[DailyQueueWorker] Worker error: ${error.message}`);
});
// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async () => {
    logger_1.logger.info('[DailyQueueWorker] Shutting down gracefully...');
    await worker.close();
    await queue.close();
    await prismaClient_1.prisma.$disconnect();
    process.exit(0);
};
process.on('SIGTERM', () => { void shutdown(); });
process.on('SIGINT', () => { void shutdown(); });
// ─── Standalone entry point ───────────────────────────────────────────────────
if (require.main === module) {
    logger_1.logger.info('[DailyQueueWorker] Starting as standalone worker process...');
    void (async () => {
        try {
            await (0, queueSetup_1.verifyRedisConnection)();
            scheduleDailyRun();
        }
        catch (error) {
            logger_1.logger.error('[DailyQueueWorker] Failed to start standalone worker process due to Redis error.');
            process.exit(1);
        }
    })();
}
//# sourceMappingURL=DailyQueueWorker.js.map