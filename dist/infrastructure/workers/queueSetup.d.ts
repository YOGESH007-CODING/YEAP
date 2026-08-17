/**
 * src/infrastructure/workers/queueSetup.ts
 *
 * Redis and BullMQ Queue initialization.
 * Manages the connection to Redis (Upstash / local) and exports the daily review queue.
 */
import { Queue } from 'bullmq';
import Redis from 'ioredis';
export declare const QUEUE_NAME = "daily-review-queue";
export interface DailyReviewJobData {
    triggeredAt: string;
    timezone: string;
}
/**
 * Creates or returns the singleton ioredis client connection.
 */
export declare const getRedisConnection: () => Redis;
/**
 * Verifies active connectivity to Redis.
 */
export declare const verifyRedisConnection: () => Promise<boolean>;
/**
 * Gets or initializes the BullMQ queue instance.
 */
export declare const getDailyReviewQueue: () => Queue<DailyReviewJobData>;
/**
 * Registers the repeatable daily review job.
 */
export declare const registerDailyJob: () => Promise<void>;
/**
 * Gracefully closes the Redis connection and BullMQ queue.
 */
export declare const closeQueue: () => Promise<void>;
//# sourceMappingURL=queueSetup.d.ts.map