/**
 * src/infrastructure/workers/DailyQueueWorker.ts
 *
 * BullMQ Worker implementation for processing daily morning review compilation.
 * Instantiates dependencies (Prisma Repositories, Resend Provider, Engine) and runs compilation.
 */

import { Worker, Job } from 'bullmq';
import { QUEUE_NAME, getRedisConnection, DailyReviewJobData } from './queueSetup';
import { prisma } from '../database/prismaClient';
import { PrismaProblemProgressRepository } from '../repositories/PrismaProblemProgressRepository';
import { PrismaProblemRepository } from '../repositories/PrismaProblemRepository';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { ResendNotificationProvider } from '../external/ResendNotificationProvider';
import { QueueCompilationEngine, CompilationResult } from '../../application/use-cases/QueueCompilationEngine';
import { logger } from '../../shared/utils/logger';

let workerInstance: Worker<DailyReviewJobData, CompilationResult> | null = null;

/**
 * Creates and starts the BullMQ daily review worker process.
 */
export const createDailyQueueWorker = (): Worker<DailyReviewJobData, CompilationResult> => {
  if (workerInstance) {
    return workerInstance;
  }

  const connection = getRedisConnection();

  logger.info(`[DailyQueueWorker] Starting BullMQ worker listening on "${QUEUE_NAME}"...`);

  workerInstance = new Worker<DailyReviewJobData, CompilationResult>(
    QUEUE_NAME,
    async (job: Job<DailyReviewJobData>): Promise<CompilationResult> => {
      logger.info(`[DailyQueueWorker] Processing job ${job.id} (name: ${job.name})...`);

      // 1. Instantiate repositories and external services
      const progressRepo = new PrismaProblemProgressRepository(prisma);
      const problemRepo = new PrismaProblemRepository(prisma);
      const userRepo = new PrismaUserRepository(prisma);
      const notificationProvider = new ResendNotificationProvider();

      // 2. Instantiate QueueCompilationEngine
      const engine = new QueueCompilationEngine({
        progressRepository: progressRepo,
        problemRepository: problemRepo,
        userRepository: userRepo,
        notificationProvider,
      });

      // 3. Execute daily queue compilation
      const result = await engine.execute();

      logger.info(
        `[DailyQueueWorker] Job ${job.id} executed successfully. ` +
        `Users processed: ${result.usersProcessed}, items: ${result.totalItemsDispatched}, failures: ${result.failures.length}`,
      );

      return result;
    },
    {
      connection,
      concurrency: 1, // Process one daily run job at a time
    },
  );

  // Event listeners
  workerInstance.on('completed', (job, result) => {
    logger.info(`[DailyQueueWorker] Job ${job.id} completed. Summary: ${JSON.stringify(result)}`);
  });

  workerInstance.on('failed', (job, err) => {
    logger.error(`[DailyQueueWorker] Job ${job?.id} failed: ${err.message}`, { stack: err.stack });
  });

  workerInstance.on('error', (err) => {
    logger.error(`[DailyQueueWorker] Internal worker error: ${err.message}`, { stack: err.stack });
  });

  return workerInstance;
};

/**
 * Gracefully shuts down the worker.
 */
export const closeWorker = async (): Promise<void> => {
  if (workerInstance) {
    logger.info('[DailyQueueWorker] Shutting down worker...');
    await workerInstance.close();
    workerInstance = null;
    logger.info('[DailyQueueWorker] Worker closed gracefully.');
  }
};
