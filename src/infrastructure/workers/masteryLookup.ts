/**
 * src/infrastructure/workers/masteryLookup.ts
 *
 * Shared topic-mastery resolver for the daily queue engine.
 *
 * The engine asks for mastery once per run (see PERFORMANCE.md M1), so this
 * collapses what used to be one query per user into a single indexed read over
 * `(userId, topicName)` and then buckets the rows in memory.
 *
 * Extracted so the BullMQ worker and the ephemeral GitHub Actions runner share
 * one implementation — previously only the BullMQ path passed a lookup, which
 * silently gave the two dispatch paths different prioritisation.
 */

import type { PrismaClient } from '@prisma/client';
import type { QueueCompilationEngineDeps } from '../../application/use-cases/QueueCompilationEngine';
import { calculateMasteryScore } from '../../application/use-cases/MemoryLayerService';

type MasteryLookup = NonNullable<QueueCompilationEngineDeps['masteryLookup']>;

export const createMasteryLookup = (db: PrismaClient): MasteryLookup =>
  async (requests) => {
    const byUser = new Map<string, Map<string, number>>();
    if (requests.length === 0) {
      return byUser;
    }

    // One query for the whole run. Filtering by the union of topics rather than
    // a per-user OR chain keeps the statement small and index-friendly; the few
    // extra rows it may return are simply never looked up.
    const userIds = requests.map((request) => request.userId);
    const topicNames = [...new Set(requests.flatMap((request) => request.topics))];

    const records = await db.userTopicMastery.findMany({
      where: { userId: { in: userIds }, topicName: { in: topicNames } },
      select: {
        userId: true,
        topicName: true,
        totalAttempts: true,
        correctAttempts: true,
        mistakeCount: true,
        lastPracticedAt: true,
      },
    });

    for (const record of records) {
      const score = calculateMasteryScore(
        record.totalAttempts,
        record.correctAttempts,
        record.mistakeCount,
        record.lastPracticedAt,
      );

      const existing = byUser.get(record.userId);
      if (existing) {
        existing.set(record.topicName, score);
      } else {
        byUser.set(record.userId, new Map([[record.topicName, score]]));
      }
    }

    return byUser;
  };
