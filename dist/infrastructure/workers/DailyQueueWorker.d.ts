/**
 * src/infrastructure/workers/DailyQueueWorker.ts
 *
 * BullMQ Worker implementation for processing daily morning review compilation.
 * Instantiates dependencies (Prisma Repositories, Resend Provider, Engine) and runs compilation.
 */
import { Worker } from 'bullmq';
import { DailyReviewJobData } from './queueSetup';
import { CompilationResult } from '../../application/use-cases/QueueCompilationEngine';
/**
 * Creates and starts the BullMQ daily review worker process.
 */
export declare const createDailyQueueWorker: () => Worker<DailyReviewJobData, CompilationResult>;
/**
 * Gracefully shuts down the worker.
 */
export declare const closeWorker: () => Promise<void>;
//# sourceMappingURL=DailyQueueWorker.d.ts.map