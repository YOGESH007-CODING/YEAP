/**
 * src/application/use-cases/ReportProblemUseCase.ts
 *
 * The primary self-report flow — zero external API calls:
 *   1. Find problem by slug (from our seeded DB)
 *   2. Find-or-create ProblemProgress record
 *   3. Compute next review via SrsEngine (pure math)
 *   4. Persist via atomicFindAndUpdate (transaction-safe)
 *
 * This is the recommended daily-use endpoint. The user searches for a problem
 * by title/slug, selects it, rates their quality, and we're done.
 *
 * SOLID Compliance:
 *   - SRP: Only handles self-report orchestration.
 *   - DIP: Depends on interfaces only — no Prisma, no LeetCode API.
 */
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { ReportDto, ReportResponseDto } from '../dtos/ReportDto';
export interface ReportProblemUseCaseDeps {
    progressRepository: IProblemProgressRepository;
    problemRepository: IProblemRepository;
}
export declare class ReportProblemUseCase {
    private readonly progressRepo;
    private readonly problemRepo;
    constructor(deps: ReportProblemUseCaseDeps);
    /**
     * Process a self-reported problem completion.
     *
     * @param userId - Authenticated user's database ID.
     * @param dto    - Validated report payload (problemSlug + qualityScore).
     */
    execute(userId: string, dto: ReportDto): Promise<ReportResponseDto>;
}
//# sourceMappingURL=ReportProblemUseCase.d.ts.map