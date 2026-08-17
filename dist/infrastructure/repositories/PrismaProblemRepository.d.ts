/**
 * src/infrastructure/repositories/PrismaProblemRepository.ts
 *
 * Concrete implementation of IProblemRepository using Prisma.
 */
import { type PrismaClient } from '@prisma/client';
import type { IProblemRepository, ProblemDto, CreateProblemDto } from '../../domain/interfaces/IProblemRepository';
export declare class PrismaProblemRepository implements IProblemRepository {
    private readonly db;
    constructor(db: PrismaClient);
    findById(id: string): Promise<ProblemDto | null>;
    findBySlug(slug: string): Promise<ProblemDto | null>;
    findAll(): Promise<ProblemDto[]>;
    create(data: CreateProblemDto): Promise<ProblemDto>;
    upsertBySlug(data: CreateProblemDto): Promise<ProblemDto>;
    getUnseenProblems(userId: string, limit: number, companyTags?: string[], topicTags?: string[]): Promise<ProblemDto[]>;
    searchByTitle(query: string, limit: number): Promise<ProblemDto[]>;
}
//# sourceMappingURL=PrismaProblemRepository.d.ts.map