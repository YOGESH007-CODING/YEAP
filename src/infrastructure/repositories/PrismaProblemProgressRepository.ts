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
      orderBy: { dueDate: 'asc' },
      ...(limit > 0 ? { take: limit } : {}),
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

    // 0 means "no cap" (matching findDueByUser). Without this, `row_number <= 0`
    // would silently match nothing and the daily run would dispatch zero items.
    const cap = perUserLimit > 0 ? perUserLimit : Number.MAX_SAFE_INTEGER;

    // Apply the per-user cap in PostgreSQL. Fetching every overdue row and
    // trimming in Node allows a large shared backlog to exhaust worker memory.
    const records = await this.db.$queryRaw<DueProgressWithProblem[]>`
      SELECT
        ranked.id,
        ranked."userId",
        ranked."problemId",
        ranked.repetitions,
        ranked."easinessFactor",
        ranked."intervalDays",
        ranked."dueDate",
        ranked."lastReviewedAt",
        ranked."createdAt",
        ranked."updatedAt",
        json_build_object(
          'id', p.id,
          'slug', p.slug,
          'title', p.title,
          'difficulty', p.difficulty,
          'topicTags', p."topicTags",
          'companyTags', p."companyTags"
        ) AS problem
      FROM (
        SELECT pp.*,
          ROW_NUMBER() OVER (
            PARTITION BY pp."userId"
            ORDER BY pp."easinessFactor" ASC, pp."dueDate" ASC
          ) AS row_number
        FROM problem_progresses pp
        WHERE pp."dueDate" <= ${now}
      ) ranked
      INNER JOIN problems p ON p.id = ranked."problemId"
      WHERE ranked.row_number <= ${cap}
      ORDER BY ranked."userId" ASC, ranked."easinessFactor" ASC, ranked."dueDate" ASC
    `;

    return records;
  }

  async countGroupedByUser(userIds: string[]): Promise<Map<string, number>> {
    if (userIds.length === 0) return new Map();

    const groups = await this.db.problemProgress.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _count: { _all: true },
    });

    return new Map(groups.map((group) => [group.userId, group._count._all]));
  }

  async countDueGroupedByUser(): Promise<Map<string, number>> {
    const groups = await this.db.problemProgress.groupBy({
      by: ['userId'],
      where: { dueDate: { lte: new Date() } },
      _count: { _all: true },
    });

    return new Map(groups.map((group) => [group.userId, group._count._all]));
  }

  async createManyForUser(userId: string, problemIds: string[]): Promise<number> {
    if (problemIds.length === 0) return 0;

    const now = new Date();
    const { count } = await this.db.problemProgress.createMany({
      // skipDuplicates relies on the userId_problemId unique constraint, which
      // keeps this idempotent across worker retries just like findOrCreate was.
      skipDuplicates: true,
      data: problemIds.map((problemId) => ({
        userId,
        problemId,
        repetitions: 0,
        easinessFactor: EF_DEFAULT,
        intervalDays: 1,
        dueDate: now,
      })),
    });

    return count;
  }

  async atomicFindAndUpdate(
    userId: string,
    problemId: string,
    updater: (current: ProblemProgressDto) => UpdateProgressDto,
  ): Promise<ProblemProgressDto> {
    return this.db.$transaction(async (tx) => {
      // The upsert and row lock must share one transaction. Otherwise another
      // request can update the newly created row before this transaction locks it.
      await tx.problemProgress.upsert({
        where: { userId_problemId: { userId, problemId } },
        update: {},
        create: { userId, problemId, repetitions: 0, easinessFactor: EF_DEFAULT, intervalDays: 1, dueDate: new Date() },
      });

      // Lock the row to prevent concurrent submits from computing on stale state
      const rows = await tx.$queryRaw<ProblemProgress[]>`
        SELECT * FROM problem_progresses
        WHERE "userId" = ${userId} AND "problemId" = ${problemId}
        FOR UPDATE
      `;

      // The upsert above guarantees a row exists inside this transaction, so an
      // empty result means something deleted it concurrently. Fail loudly rather
      // than dereferencing undefined further down.
      const current = rows[0];
      if (!current) {
        throw new Error(
          `[ProblemProgress] Row missing after upsert for user ${userId} / problem ${problemId}.`,
        );
      }

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

  async findPageByUser(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<DueProgressWithProblem[]> {
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
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }], // Stable order across pages
      skip: offset,
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

  async countByUser(userId: string): Promise<number> {
    // Index-only count — no row materialization, no problem join.
    return this.db.problemProgress.count({ where: { userId } });
  }

}
