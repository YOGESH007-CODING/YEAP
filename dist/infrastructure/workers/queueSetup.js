"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWorker = exports.createQueueEvents = exports.createDailyReviewQueue = exports.verifyRedisConnection = exports.getConnectionOptions = exports.JOB_NAMES = exports.QUEUE_NAMES = void 0;
/**
 * src/infrastructure/workers/queueSetup.ts
 *
 * BullMQ queue initialization and Redis connection configuration.
 * NOTE: BullMQ bundles its own ioredis — use connection options (host/port/password)
 * directly rather than a standalone ioredis instance to avoid type conflicts.
 */
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const url_1 = require("url");
const logger_1 = require("../../shared/utils/logger");
// ─── Queue Names ──────────────────────────────────────────────────────────────
exports.QUEUE_NAMES = {
    DAILY_REVIEW: 'daily-review-queue',
};
// ─── Job Names ────────────────────────────────────────────────────────────────
exports.JOB_NAMES = {
    COMPILE_AND_DISPATCH: 'compile-and-dispatch',
};
// ─── Redis Connection Options (no separate ioredis instance) ──────────────────
/**
 * Returns BullMQ-compatible connection options.
 * BullMQ manages its own ioredis connection pool internally.
 */
const getConnectionOptions = () => {
    const redisUrl = process.env['REDIS_URL'];
    if (redisUrl) {
        try {
            const parsed = new url_1.URL(redisUrl);
            return {
                host: parsed.hostname,
                port: parseInt(parsed.port || '6379', 10),
                password: parsed.password || undefined,
                maxRetriesPerRequest: null, // Required by BullMQ
                enableReadyCheck: false, // Required by BullMQ
            };
        }
        catch {
            logger_1.logger.warn('[Redis] Failed to parse REDIS_URL. Falling back to separate environment variables.');
        }
    }
    return {
        host: process.env['REDIS_HOST'] ?? 'localhost',
        port: parseInt(process.env['REDIS_PORT'] ?? '6379', 10),
        password: process.env['REDIS_PASSWORD'] || undefined,
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false, // Required by BullMQ
    };
};
exports.getConnectionOptions = getConnectionOptions;
/**
 * Performs a startup health check on the Redis connection.
 * Throws a clear startup error if the connection fails.
 */
const verifyRedisConnection = async () => {
    const redisUrl = process.env['REDIS_URL'];
    let client;
    logger_1.logger.info('[Redis] Verifying connection health...');
    if (redisUrl) {
        client = new ioredis_1.default(redisUrl, { maxRetriesPerRequest: 1 });
    }
    else {
        const opts = (0, exports.getConnectionOptions)();
        client = new ioredis_1.default({
            host: opts.host,
            port: opts.port,
            password: opts.password,
            maxRetriesPerRequest: 1, // Fail fast for the check
        });
    }
    try {
        await client.ping();
        logger_1.logger.info('🔌 Redis connection verified successfully.');
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`❌ Redis connection failed: ${msg}. Please ensure Redis is running.`);
        throw new Error(`Redis connection check failed: ${msg}`);
    }
    finally {
        await client.quit();
    }
};
exports.verifyRedisConnection = verifyRedisConnection;
// ─── Queue Factory ────────────────────────────────────────────────────────────
const createDailyReviewQueue = () => {
    const queue = new bullmq_1.Queue(exports.QUEUE_NAMES.DAILY_REVIEW, {
        connection: (0, exports.getConnectionOptions)(),
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000, // 5s, 10s, 20s
            },
            removeOnComplete: 100, // Keep last 100 completed jobs
            removeOnFail: 50, // Keep last 50 failed jobs
        },
    });
    queue.on('error', (error) => {
        logger_1.logger.error(`[BullMQ Queue] Error: ${error.message}`);
    });
    return queue;
};
exports.createDailyReviewQueue = createDailyReviewQueue;
// ─── Queue Events (for logging/monitoring) ────────────────────────────────────
const createQueueEvents = (queueName) => {
    return new bullmq_1.QueueEvents(queueName, {
        connection: (0, exports.getConnectionOptions)(),
    });
};
exports.createQueueEvents = createQueueEvents;
// ─── Worker Factory ───────────────────────────────────────────────────────────
const createWorker = (queueName, processor) => {
    return new bullmq_1.Worker(queueName, processor, {
        connection: (0, exports.getConnectionOptions)(),
        concurrency: 1, // Serial processing for daily runs
    });
};
exports.createWorker = createWorker;
//# sourceMappingURL=queueSetup.js.map