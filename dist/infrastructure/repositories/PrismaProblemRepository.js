"use strict";
/**
 * src/infrastructure/repositories/PrismaProblemRepository.ts
 *
 * Concrete implementation of IProblemRepository using Prisma.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaProblemRepository = void 0;
// ─── Mapper ───────────────────────────────────────────────────────────────────
const toDto = (problem) => ({
    id: problem.id,
    slug: problem.slug,
    title: problem.title,
    difficulty: problem.difficulty,
    topicTags: problem.topicTags,
    companyTags: problem.companyTags,
    createdAt: problem.createdAt,
    updatedAt: problem.updatedAt,
});
// ─── Repository ───────────────────────────────────────────────────────────────
class PrismaProblemRepository {
    constructor(db) {
        this.db = db;
    }
    async findById(id) {
        const problem = await this.db.problem.findUnique({ where: { id } });
        return problem ? toDto(problem) : null;
    }
    async findBySlug(slug) {
        const problem = await this.db.problem.findUnique({ where: { slug } });
        return problem ? toDto(problem) : null;
    }
    async findAll() {
        const problems = await this.db.problem.findMany({
            orderBy: { createdAt: 'asc' },
        });
        return problems.map(toDto);
    }
    async create(data) {
        const problem = await this.db.problem.create({
            data: {
                slug: data.slug,
                title: data.title,
                difficulty: data.difficulty,
                topicTags: data.topicTags,
                companyTags: data.companyTags ?? [],
            },
        });
        return toDto(problem);
    }
    async upsertBySlug(data) {
        const problem = await this.db.problem.upsert({
            where: { slug: data.slug },
            update: {
                title: data.title,
                difficulty: data.difficulty,
                topicTags: data.topicTags,
                companyTags: data.companyTags ?? [],
            },
            create: {
                slug: data.slug,
                title: data.title,
                difficulty: data.difficulty,
                topicTags: data.topicTags,
                companyTags: data.companyTags ?? [],
            },
        });
        return toDto(problem);
    }
    async getUnseenProblems(userId, limit, companyTags, topicTags) {
        const problems = await this.db.problem.findMany({
            where: {
                progresses: {
                    none: {
                        userId,
                    },
                },
                ...(companyTags ? { companyTags: { hasSome: companyTags } } : {}),
                ...(topicTags ? { topicTags: { hasSome: topicTags } } : {}),
            },
            take: limit,
            orderBy: { createdAt: 'desc' },
        });
        return problems.map(toDto);
    }
    async searchByTitle(query, limit) {
        const problems = await this.db.problem.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { slug: { contains: query, mode: 'insensitive' } },
                ],
            },
            take: limit,
            orderBy: { title: 'asc' },
        });
        return problems.map(toDto);
    }
}
exports.PrismaProblemRepository = PrismaProblemRepository;
//# sourceMappingURL=PrismaProblemRepository.js.map