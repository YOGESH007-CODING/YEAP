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
import 'dotenv/config';
import { type CompileAndDispatchJobData } from './queueSetup';
declare const queue: import("bullmq").Queue<CompileAndDispatchJobData, any, string, CompileAndDispatchJobData, any, string>;
declare const worker: import("bullmq").Worker<CompileAndDispatchJobData, any, string>;
/**
 * Cron expression: "0 4 * * *" = 4:00 AM every day UTC
 * The job is enqueued to BullMQ rather than executed inline,
 * allowing the worker to handle retries and backpressure properly.
 */
declare const scheduleDailyRun: () => void;
export { queue, worker, scheduleDailyRun };
//# sourceMappingURL=DailyQueueWorker.d.ts.map