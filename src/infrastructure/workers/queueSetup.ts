/**
 * src/infrastructure/workers/queueSetup.ts
 *
 * Redis and BullMQ Queue initialization.
 * Manages the connection to Redis (Upstash / local) and exports the daily review queue.
 */

import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../../shared/utils/logger';

export const QUEUE_NAME = 'daily-review-queue';

export interface DailyReviewJobData {
  triggeredAt: string;
  timezone: string;
}

let redisClient: Redis | null = null;
let workerConnection: Redis | null = null;
let dailyReviewQueue: Queue<DailyReviewJobData> | null = null;

/**
 * Creates or returns the singleton ioredis client connection.
 */
export const getRedisConnection = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required to connect to Redis.');
  }

  logger.info('[Redis] Initializing Redis connection...');

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  if (typeof redisClient.on === 'function') {
    redisClient.on('connect', () => {
      logger.info('[Redis] Successfully connected to Redis.');
    });

    redisClient.on('error', (err) => {
      logger.error(`[Redis] Connection error: ${err.message}`);
    });
  }

  return redisClient;
};

/**
 * Returns a dedicated Redis connection for the BullMQ Worker.
 *
 * BullMQ Workers issue *blocking* Redis commands; sharing a single connection
 * with the Queue can cause head-of-line blocking. Giving the Worker its own
 * connection is BullMQ's documented recommendation. See PERFORMANCE.md M8.
 */
export const getWorkerConnection = (): Redis => {
  if (workerConnection) {
    return workerConnection;
  }

  const redisUrl = process.env['REDIS_URL'];
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required to connect to Redis.');
  }

  logger.info('[Redis] Initializing dedicated worker Redis connection...');

  workerConnection = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    tls: redisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
  });

  if (typeof workerConnection.on === 'function') {
    workerConnection.on('error', (err) => {
      logger.error(`[Redis] Worker connection error: ${err.message}`);
    });
  }

  return workerConnection;
};

/**
 * Verifies active connectivity to Redis.
 */
export const verifyRedisConnection = async (): Promise<boolean> => {
  try {
    const connection = getRedisConnection();
    const pingResponse = await connection.ping();
    logger.info(`[Redis] Connectivity test response: ${pingResponse}`);
    return pingResponse === 'PONG';
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`[Redis] Verification failed: ${msg}`);
    throw new Error(`Redis verification failed: ${msg}`);
  }
};

/**
 * Gets or initializes the BullMQ queue instance.
 */
export const getDailyReviewQueue = (): Queue<DailyReviewJobData> => {
  if (dailyReviewQueue) {
    return dailyReviewQueue;
  }

  const connection = getRedisConnection();
  dailyReviewQueue = new Queue<DailyReviewJobData>(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 30_000, // 30s initial backoff delay
      },
      removeOnComplete: { age: 86400 * 7, count: 100 }, // Keep max 100 completed jobs up to 7 days
      removeOnFail: { age: 86400 * 14, count: 200 },
    },
  });

  return dailyReviewQueue;
};

/**
 * Registers the repeatable daily review job.
 */
export const registerDailyJob = async (): Promise<void> => {
  const queue = getDailyReviewQueue();
  const cron = process.env['QUEUE_CRON'] ?? '0 4 * * *';
  const tz = process.env['QUEUE_TIMEZONE'] ?? 'Asia/Kolkata';

  logger.info(`[BullMQ] Upserting repeatable daily job scheduler: cron="${cron}", tz="${tz}"`);

  await queue.upsertJobScheduler(
    'daily-morning-review-scheduler',
    {
      pattern: cron,
      tz,
    },
    {
      name: 'daily-morning-review-job',
      data: {
        triggeredAt: new Date().toISOString(),
        timezone: tz,
      },
    },
  );

  logger.info('[BullMQ] Daily job scheduler successfully registered.');
};

/**
 * Gracefully closes the Redis connection and BullMQ queue.
 */
export const closeQueue = async (): Promise<void> => {
  if (dailyReviewQueue) {
    await dailyReviewQueue.close();
    dailyReviewQueue = null;
    logger.info('[BullMQ] Queue closed.');
  }

  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('[Redis] Client connection closed.');
  }

  if (workerConnection) {
    await workerConnection.quit();
    workerConnection = null;
    logger.info('[Redis] Worker connection closed.');
  }
};
