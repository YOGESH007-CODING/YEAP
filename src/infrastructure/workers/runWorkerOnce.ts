/**
 * src/infrastructure/workers/runWorkerOnce.ts
 *
 * Ephemeral runner designed for GitHub Actions daily cron jobs.
 * Connects, executes one morning review batch run immediately, and exits cleanly.
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { prisma, disconnectPrisma } from '../database/prismaClient';
import { PrismaProblemProgressRepository } from '../repositories/PrismaProblemProgressRepository';
import { PrismaProblemRepository } from '../repositories/PrismaProblemRepository';
import { PrismaUserRepository } from '../repositories/PrismaUserRepository';
import { ResendNotificationProvider } from '../external/ResendNotificationProvider';
import { QueueCompilationEngine } from '../../application/use-cases/QueueCompilationEngine';
import { createMasteryLookup } from './masteryLookup';
import { logger } from '../../shared/utils/logger';

const runOnce = async (): Promise<void> => {
  logger.info('🚀 [Ephemeral Worker] Starting single-run morning review compilation...');

  try {
    const progressRepo = new PrismaProblemProgressRepository(prisma);
    const problemRepo = new PrismaProblemRepository(prisma);
    const userRepo = new PrismaUserRepository(prisma);
    const notificationProvider = new ResendNotificationProvider();

    const engine = new QueueCompilationEngine({
      progressRepository: progressRepo,
      problemRepository: problemRepo,
      userRepository: userRepo,
      notificationProvider,
      // Same mastery-aware prioritisation as the BullMQ worker — this runner
      // previously omitted it and fell back to a neutral 50 for every topic.
      masteryLookup: createMasteryLookup(prisma),
    });

    const result = await engine.execute();

    logger.info(
      `✅ [Ephemeral Worker] Compilation finished. Users: ${result.usersProcessed}, ` +
      `Items: ${result.totalItemsDispatched}, Failures: ${result.failures.length}`,
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error(`❌ [Ephemeral Worker] Run failed: ${msg}`);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
    logger.info('👋 [Ephemeral Worker] Disconnected from DB. Exiting.');
  }
};

void runOnce();
