"use strict";
/**
 * src/infrastructure/repositories/PrismaProblemProgressRepository.ts
 *
 * Concrete implementation of IProblemProgressRepository using Prisma.
 * This is the most complex repository — handles SM-2 state and due-date queue queries.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaProblemProgressRepository = void 0;
const SrsEngine_1 = require("../../domain/SrsEngine");
// ─── Mapper ───────────────────────────────────────────────────────────────────
const toDto = (progress) => ({
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
class PrismaProblemProgressRepository {
    constructor(db) {
        this.db = db;
    }
    async findByUserAndProblem(userId, problemId) {
        const progress = await this.db.problemProgress.findUnique({
            where: { userId_problemId: { userId, problemId } },
        });
        return progress ? toDto(progress) : null;
    }
    async findOrCreate(userId, problemId) {
        // Atomic upsert — creates with defaults if not existing
        const progress = await this.db.problemProgress.upsert({
            where: { userId_problemId: { userId, problemId } },
            update: {}, // No update if already exists
            create: {
                userId,
                problemId,
                repetitions: 0,
                easinessFactor: SrsEngine_1.EF_DEFAULT,
                intervalDays: 1,
                dueDate: new Date(),
            },
        });
        return toDto(progress);
    }
    async update(id, data) {
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
    async findDueByUser(userId, limit) {
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
    async findAllDue(perUserLimit) {
        const now = new Date();
        // Apply the per-user cap in PostgreSQL. Fetching every overdue row and
        // trimming in Node allows a large shared backlog to exhaust worker memory.
        const records = await this.db.$queryRaw `
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
      WHERE ranked.row_number <= ${perUserLimit}
      ORDER BY ranked."userId" ASC, ranked."easinessFactor" ASC, ranked."dueDate" ASC
    `;
        return records;
    }
    async atomicFindAndUpdate(userId, problemId, updater) {
        return this.db.$transaction(async (tx) => {
            // The upsert and row lock must share one transaction. Otherwise another
            // request can update the newly created row before this transaction locks it.
            await tx.problemProgress.upsert({
                where: { userId_problemId: { userId, problemId } },
                update: {},
                create: { userId, problemId, repetitions: 0, easinessFactor: SrsEngine_1.EF_DEFAULT, intervalDays: 1, dueDate: new Date() },
            });
            // Lock the row to prevent concurrent submits from computing on stale state
            const rows = await tx.$queryRaw `
        SELECT * FROM problem_progresses
        WHERE "userId" = ${userId} AND "problemId" = ${problemId}
        FOR UPDATE
      `;
            let current;
            current = rows[0];
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
    async findAllByUser(userId) {
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
exports.PrismaProblemProgressRepository = PrismaProblemProgressRepository;
//# sourceMappingURL=PrismaProblemProgressRepository.js.map