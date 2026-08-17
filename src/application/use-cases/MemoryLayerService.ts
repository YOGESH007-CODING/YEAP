import { MistakeType, PrismaClient } from '@prisma/client';

export const MISTAKE_TYPES = ['LOGIC_ERROR', 'EDGE_CASE', 'WRONG_APPROACH', 'TIME_COMPLEXITY', 'MISREAD_PROBLEM', 'FORGOT_PATTERN', 'SYNTAX_SLIP'] as const;
export type MistakeInput = { type: MistakeType; description?: string };

export const calculateMasteryScore = (total: number, correct: number, mistakes: number, lastPracticedAt: Date, now = new Date()): number => {
  if (total === 0) return 0;
  const ageDays = Math.max(0, (now.getTime() - lastPracticedAt.getTime()) / 86_400_000);
  const recencyWeight = ageDays <= 14 ? 1 : ageDays >= 60 ? 0.5 : 1 - ((ageDays - 14) / 46) * 0.5;
  return Math.max(0, Math.min(100, (correct / total) * 100 - (mistakes / total) * 30 * recencyWeight));
};

/** Records a review's memory signals in the same request, after SM-2 is persisted. */
export class MemoryLayerService {
  constructor(private readonly db: PrismaClient) {}

  async recordReview(userId: string, problemId: string, qualityScore: number, mistake?: MistakeInput): Promise<void> {
    const problem = await this.db.problem.findUniqueOrThrow({ where: { id: problemId }, select: { topicTags: true } });
    const now = new Date();
    await this.db.$transaction(async (tx) => {
      if (mistake && qualityScore <= 2) {
        await tx.userMistake.upsert({
          where: { userId_problemId_mistakeType: { userId, problemId, mistakeType: mistake.type } },
          create: { userId, problemId, topicName: problem.topicTags[0] ?? 'Uncategorized', mistakeType: mistake.type, description: mistake.description },
          update: { recurrenceCount: { increment: 1 }, createdAt: now, description: mistake.description ?? undefined, resolvedAt: null },
        });
      }
      // A successful recall resolves all unresolved mistakes for this problem.
      if (qualityScore >= 3) await tx.userMistake.updateMany({ where: { userId, problemId, resolvedAt: null }, data: { resolvedAt: now } });

      for (const topicName of problem.topicTags) {
        const prior = await tx.userTopicMastery.findUnique({ where: { userId_topicName: { userId, topicName } } });
        const totalAttempts = (prior?.totalAttempts ?? 0) + 1;
        const correctAttempts = (prior?.correctAttempts ?? 0) + (qualityScore >= 3 ? 1 : 0);
        const mistakeCount = (prior?.mistakeCount ?? 0) + (mistake && qualityScore <= 2 ? 1 : 0);
        await tx.userTopicMastery.upsert({
          where: { userId_topicName: { userId, topicName } },
          create: { userId, topicName, totalAttempts, correctAttempts, mistakeCount, lastPracticedAt: now, masteryScore: calculateMasteryScore(totalAttempts, correctAttempts, mistakeCount, now) },
          update: { totalAttempts, correctAttempts, mistakeCount, lastPracticedAt: now, masteryScore: calculateMasteryScore(totalAttempts, correctAttempts, mistakeCount, now) },
        });
      }
    });
  }
}
