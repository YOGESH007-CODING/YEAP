/**
 * src/infrastructure/repositories/PrismaProblemProgressRepository.ts
 *
 * Concrete implementation of IProblemProgressRepository using Prisma.
 * This is the most complex repository — handles SM-2 state and due-date queue queries.
 */
import type { PrismaClient } from '@prisma/client';
import type { IProblemProgressRepository, ProblemProgressDto, UpdateProgressDto, DueProgressWithProblem } from '../../domain/interfaces/IProblemProgressRepository';
export declare class PrismaProblemProgressRepository implements IProblemProgressRepository {
    private readonly db;
    constructor(db: PrismaClient);
    findByUserAndProblem(userId: string, problemId: string): Promise<ProblemProgressDto | null>;
    findOrCreate(userId: string, problemId: string): Promise<ProblemProgressDto>;
    update(id: string, data: UpdateProgressDto): Promise<ProblemProgressDto>;
    findDueByUser(userId: string, limit: number): Promise<DueProgressWithProblem[]>;
    findAllDue(perUserLimit: number): Promise<DueProgressWithProblem[]>;
    atomicFindAndUpdate(userId: string, problemId: string, updater: (current: ProblemProgressDto) => UpdateProgressDto): Promise<ProblemProgressDto>;
    findAllByUser(userId: string): Promise<DueProgressWithProblem[]>;
}
//# sourceMappingURL=PrismaProblemProgressRepository.d.ts.map