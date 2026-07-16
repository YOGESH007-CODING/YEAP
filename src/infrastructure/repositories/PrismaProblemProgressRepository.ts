/**
 * src/infrastructure/repositories/PrismaProblemProgressRepository.ts
 *
 * Concrete implementation of IProblemProgressRepository using Prisma.
 * This is the most complex repository — handles SM-2 state and due-date queue queries.
 */

import type { PrismaClient, ProblemProgress } from '@prisma/client';
import type {
  IProblemProgressRepository,
  ProblemProgressDto,
  UpdateProgressDto,
  DueProgressWithProblem,
} from '../../domain/interfaces/IProblemProgressRepository';
import { EF_DEFAULT } from '../../domain/SrsEngine';

// ─── Mapper ───────────────────────────────────────────────────────────────────

const toDto = (progress: ProblemProgress): ProblemProgressDto => ({
  id: progress.id,
  userId: progress.userId,
  problemId: progress.problemId,
  repetitions: progress.repetitions,
  easinessFactor: progress.easinessFactor,
  intervalDays: progress.intervalDays,
  dueDate: progress.dueDate,
  lastReviewedAt: progress.lastReviewedAt,
  createdAt: progress.createdAt,
  updatedAt: progress.updatedAt,
});

// ─── Repository ───────────────────────────────────────────────────────────────

export class PrismaProblemProgressRepository implements IProblemProgressRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByUserAndProblem(
    userId: string,
    problemId: string,
  ): Promise<ProblemProgressDto | null> {
    const progress = await this.db.problemProgress.findUnique({
      where: { userId_problemId: { userId, problemId } },
    });
    return progress ? toDto(progress) : null;
  }

  async findOrCreate(
    userId: string,
    problemId: string,
  ): Promise<ProblemProgressDto> {
    // Atomic upsert — creates with defaults if not existing
    const progress = await this.db.problemProgress.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: {}, // No update if already exists
      create: {
        userId,
        problemId,
        repetitions: 0,
        easinessFactor: EF_DEFAULT,
        intervalDays: 1,
        dueDate: new Date(),
      },
    });
    return toDto(progress);
  }

  async update(id: string, data: UpdateProgressDto): Promise<ProblemProgressDto> {
    const progress = await this.db.problemProgress.update({
      where: { id },
      data: {
        repetitions: data.repetitions,
        easinessFactor: data.easinessFactor,
        intervalDays: data.intervalDays,
        dueDate: data.dueDate,
        lastReviewedAt: data.lastReviewedAt,
      },
    });
    return toDto(progress);
  }

  async findDueByUser(
    userId: string,
    limit: number,
  ): Promise<DueProgressWithProblem[]> {
    const now = new Date();

    const records = await this.db.problemProgress.findMany({
      where: {
        userId,
        dueDate: { lte: now }, // Uses the dueDate index
      },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            topicTags: true,
            companyTags: true,
          },
        },
      },
      orderBy: { easinessFactor: 'asc' }, // Sinking EF first = most critical
      take: limit,
    });

    return records.map((r) => ({
      ...toDto(r),
      problem: {
        id: r.problem.id,
        slug: r.problem.slug,
        title: r.problem.title,
        difficulty: r.problem.difficulty,
        topicTags: r.problem.topicTags,
        companyTags: r.problem.companyTags,
      },
    }));
  }

  async findAllDue(perUserLimit: number): Promise<DueProgressWithProblem[]> {
    const now = new Date();

    // Fetch all overdue records — grouped in-memory after DB fetch
    // The dueDate index makes this query efficient at scale
    const records = await this.db.problemProgress.findMany({
      where: {
        dueDate: { lte: now },
      },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            topicTags: true,
            companyTags: true,
          },
        },
      },
      orderBy: [
        { userId: 'asc' },
        { easinessFactor: 'asc' }, // Within each user: lowest EF first
      ],
    });

    // Apply per-user cap at the application layer
    const userCounts = new Map<string, number>();
    const capped: DueProgressWithProblem[] = [];

    for (const r of records) {
      const count = userCounts.get(r.userId) ?? 0;
      if (count >= perUserLimit) continue;

      userCounts.set(r.userId, count + 1);
      capped.push({
        ...toDto(r),
        problem: {
          id: r.problem.id,
          slug: r.problem.slug,
          title: r.problem.title,
          difficulty: r.problem.difficulty,
          topicTags: r.problem.topicTags,
          companyTags: r.problem.companyTags,
        },
      });
    }

    return capped;
  }

  async atomicFindAndUpdate(
    userId: string,
    problemId: string,
    updater: (current: ProblemProgressDto) => UpdateProgressDto,
  ): Promise<ProblemProgressDto> {
    await this.db.problemProgress.upsert({
      where: { userId_problemId: { userId, problemId } },
      update: {},
      create: { userId, problemId, repetitions: 0, easinessFactor: EF_DEFAULT, intervalDays: 1, dueDate: new Date() },
    });
    return this.db.$transaction(async (tx) => {
      // Lock the row to prevent concurrent submits from computing on stale state
      const rows = await tx.$queryRaw<ProblemProgress[]>`
        SELECT * FROM problem_progresses
        WHERE "userId" = ${userId} AND "problemId" = ${problemId}
        FOR UPDATE
      `;

      let current: ProblemProgress;

      current = rows[0]!;

      const updateData = updater(toDto(current));

      const updated = await tx.problemProgress.update({
        where: { id: current.id },
        data: {
          repetitions: updateData.repetitions,
          easinessFactor: updateData.easinessFactor,
          intervalDays: updateData.intervalDays,
          dueDate: updateData.dueDate,
          lastReviewedAt: updateData.lastReviewedAt,
        },
      });

      return toDto(updated);
    });
  }

  async findAllByUser(userId: string): Promise<DueProgressWithProblem[]> {
    const records = await this.db.problemProgress.findMany({
      where: { userId },
      include: {
        problem: {
          select: {
            id: true,
            slug: true,
            title: true,
            difficulty: true,
            topicTags: true,
            companyTags: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' }, // Most urgent (overdue) first
    });

    return records.map((r) => ({
      ...toDto(r),
      problem: {
        id: r.problem.id,
        slug: r.problem.slug,
        title: r.problem.title,
        difficulty: r.problem.difficulty,
        topicTags: r.problem.topicTags,
        companyTags: r.problem.companyTags,
      },
    }));
  }

}
