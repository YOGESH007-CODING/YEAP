/**
 * src/infrastructure/workers/queueSetup.ts
 *
 * BullMQ queue initialization and Redis connection configuration.
 * NOTE: BullMQ bundles its own ioredis — use connection options (host/port/password)
 * directly rather than a standalone ioredis instance to avoid type conflicts.
 */
import { Queue, Worker, QueueEvents, type ConnectionOptions } from 'bullmq';
export declare const QUEUE_NAMES: {
    readonly DAILY_REVIEW: "daily-review-queue";
};
export declare const JOB_NAMES: {
    readonly COMPILE_AND_DISPATCH: "compile-and-dispatch";
};
export interface CompileAndDispatchJobData {
    triggeredAt: string;
    triggeredBy: 'cron' | 'manual';
}
/**
 * Returns BullMQ-compatible connection options.
 * BullMQ manages its own ioredis connection pool internally.
 */
export declare const getConnectionOptions: () => ConnectionOptions;
/**
 * Performs a startup health check on the Redis connection.
 * Throws a clear startup error if the connection fails.
 */
export declare const verifyRedisConnection: () => Promise<void>;
export declare const createDailyReviewQueue: () => Queue<CompileAndDispatchJobData>;
export declare const createQueueEvents: (queueName: string) => QueueEvents;
export declare const createWorker: <T>(queueName: string, processor: (job: import("bullmq").Job<T>) => Promise<void>) => Worker<T>;
//# sourceMappingURL=queueSetup.d.ts.map