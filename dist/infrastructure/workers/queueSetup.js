"use strict";
/**
 * src/infrastructure/workers/queueSetup.ts
 *
 * Redis and BullMQ Queue initialization.
 * Manages the connection to Redis (Upstash / local) and exports the daily review queue.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeQueue = exports.registerDailyJob = exports.getDailyReviewQueue = exports.verifyRedisConnection = exports.getWorkerConnection = exports.getRedisConnection = exports.QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../../shared/utils/logger");
exports.QUEUE_NAME = 'daily-review-queue';
let redisClient = null;
let workerConnection = null;
let dailyReviewQueue = null;
/**
 * Creates or returns the singleton ioredis client connection.
 */
const getRedisConnection = () => {
    if (redisClient) {
        return redisClient;
    }
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required to connect to Redis.');
    }
    logger_1.logger.info('[Redis] Initializing Redis connection...');
    redisClient = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    if (typeof redisClient.on === 'function') {
        redisClient.on('connect', () => {
            logger_1.logger.info('[Redis] Successfully connected to Redis.');
        });
        redisClient.on('error', (err) => {
            logger_1.logger.error(`[Redis] Connection error: ${err.message}`);
        });
    }
    return redisClient;
};
exports.getRedisConnection = getRedisConnection;
/**
 * Returns a dedicated Redis connection for the BullMQ Worker.
 *
 * BullMQ Workers issue *blocking* Redis commands; sharing a single connection
 * with the Queue can cause head-of-line blocking. Giving the Worker its own
 * connection is BullMQ's documented recommendation. See PERFORMANCE.md M8.
 */
const getWorkerConnection = () => {
    if (workerConnection) {
        return workerConnection;
    }
    const redisUrl = process.env['REDIS_URL'];
    if (!redisUrl) {
        throw new Error('REDIS_URL environment variable is required to connect to Redis.');
    }
    logger_1.logger.info('[Redis] Initializing dedicated worker Redis connection...');
    workerConnection = new ioredis_1.default(redisUrl, {
        maxRetriesPerRequest: null, // Required by BullMQ
        enableReadyCheck: false,
        tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    });
    if (typeof workerConnection.on === 'function') {
        workerConnection.on('error', (err) => {
            logger_1.logger.error(`[Redis] Worker connection error: ${err.message}`);
        });
    }
    return workerConnection;
};
exports.getWorkerConnection = getWorkerConnection;
/**
 * Verifies active connectivity to Redis.
 */
const verifyRedisConnection = async () => {
    try {
        const connection = (0, exports.getRedisConnection)();
        const pingResponse = await connection.ping();
        logger_1.logger.info(`[Redis] Connectivity test response: ${pingResponse}`);
        return pingResponse === 'PONG';
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger_1.logger.error(`[Redis] Verification failed: ${msg}`);
        throw new Error(`Redis verification failed: ${msg}`);
    }
};
exports.verifyRedisConnection = verifyRedisConnection;
/**
 * Gets or initializes the BullMQ queue instance.
 */
const getDailyReviewQueue = () => {
    if (dailyReviewQueue) {
        return dailyReviewQueue;
    }
    const connection = (0, exports.getRedisConnection)();
    dailyReviewQueue = new bullmq_1.Queue(exports.QUEUE_NAME, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 30000, // 30s initial backoff delay
            },
            removeOnComplete: { age: 86400 * 7, count: 100 }, // Keep max 100 completed jobs up to 7 days
            removeOnFail: { age: 86400 * 14, count: 200 },
        },
    });
    return dailyReviewQueue;
};
exports.getDailyReviewQueue = getDailyReviewQueue;
/**
 * Registers the repeatable daily review job.
 */
const registerDailyJob = async () => {
    const queue = (0, exports.getDailyReviewQueue)();
    const cron = process.env['QUEUE_CRON'] ?? '0 4 * * *';
    const tz = process.env['QUEUE_TIMEZONE'] ?? 'Asia/Kolkata';
    logger_1.logger.info(`[BullMQ] Upserting repeatable daily job scheduler: cron="${cron}", tz="${tz}"`);
    await queue.upsertJobScheduler('daily-morning-review-scheduler', {
        pattern: cron,
        tz,
    }, {
        name: 'daily-morning-review-job',
        data: {
            triggeredAt: new Date().toISOString(),
            timezone: tz,
        },
    });
    logger_1.logger.info('[BullMQ] Daily job scheduler successfully registered.');
};
exports.registerDailyJob = registerDailyJob;
/**
 * Gracefully closes the Redis connection and BullMQ queue.
 */
const closeQueue = async () => {
    if (dailyReviewQueue) {
        await dailyReviewQueue.close();
        dailyReviewQueue = null;
        logger_1.logger.info('[BullMQ] Queue closed.');
    }
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.logger.info('[Redis] Client connection closed.');
    }
    if (workerConnection) {
        await workerConnection.quit();
        workerConnection = null;
        logger_1.logger.info('[Redis] Worker connection closed.');
    }
};
exports.closeQueue = closeQueue;
//# sourceMappingURL=queueSetup.js.map