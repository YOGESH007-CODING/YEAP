/**
 * src/application/use-cases/ReviewUseCaseProcessor.ts
 *
 * Orchestrates the review submission flow:
 *   1. Optionally verify submission via LeetCode API
 *   2. Fetch or initialize the user's SM-2 progress record
 *   3. Compute next review schedule via SrsEngine (pure math)
 *   4. Persist the updated state via repository interface
 *
 * SOLID Compliance:
 *   - SRP: Only handles review submission orchestration.
 *   - DIP: Depends strictly on interfaces, never on Prisma or concrete classes.
 */
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { ILeetCodeClient } from '../../domain/interfaces/ILeetCodeClient';
import type { ReviewSubmitDto, ReviewSubmitResponseDto } from '../dtos/ReviewSubmitDto';
export interface ReviewUseCaseProcessorDeps {
    progressRepository: IProblemProgressRepository;
    problemRepository: IProblemRepository;
    userRepository: IUserRepository;
    leetCodeClient: ILeetCodeClient;
}
export declare class ReviewUseCaseProcessor {
    private readonly progressRepo;
    private readonly problemRepo;
    private readonly userRepo;
    private readonly leetCodeClient;
    constructor(deps: ReviewUseCaseProcessorDeps);
    /**
     * Process a review submission from a user.
     *
     * @param userId - Authenticated user's database ID.
     * @param dto    - Validated review payload (problemId + qualityScore).
     * @param verifyWithLeetCode - If true, cross-checks submission via LeetCode GraphQL.
     */
    execute(userId: string, dto: ReviewSubmitDto, verifyWithLeetCode?: boolean): Promise<ReviewSubmitResponseDto>;
}
//# sourceMappingURL=ReviewUseCaseProcessor.d.ts.map