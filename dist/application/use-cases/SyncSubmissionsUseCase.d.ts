/**
 * src/application/use-cases/SyncSubmissionsUseCase.ts
 *
 * Orchestrates auto-detection of today's LeetCode completions:
 *   1. Fetches the user's recent accepted submissions from LeetCode API
 *   2. Filters to submissions made today (UTC)
 *   3. Deduplicates by problem slug (keeps latest per problem)
 *   4. Auto-tracks new problems (upserts Problem + creates ProblemProgress)
 *   5. Returns structured response for quality score submission
 *
 * SOLID Compliance:
 *   - SRP: Only handles submission sync orchestration.
 *   - DIP: Depends strictly on interfaces, never on Prisma or concrete classes.
 */
import type { ILeetCodeClient } from '../../domain/interfaces/ILeetCodeClient';
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { SyncResponseDto } from '../dtos/SyncSubmissionsDto';
export interface SyncSubmissionsUseCaseDeps {
    progressRepository: IProblemProgressRepository;
    problemRepository: IProblemRepository;
    userRepository: IUserRepository;
    leetCodeClient: ILeetCodeClient;
}
export declare class SyncSubmissionsUseCase {
    private readonly progressRepo;
    private readonly problemRepo;
    private readonly userRepo;
    private readonly leetCodeClient;
    constructor(deps: SyncSubmissionsUseCaseDeps);
    /**
     * Sync today's LeetCode accepted submissions for a user.
     *
     * @param userId - Authenticated user's database ID.
     * @returns Structured sync result with newly tracked and existing problems.
     */
    execute(userId: string): Promise<SyncResponseDto>;
    /**
     * Process a single LeetCode submission:
     *   - Ensure the Problem exists in our DB (upsert via LeetCode metadata)
     *   - Check if user already has a ProblemProgress record
     *   - Create one if missing
     */
    private processSubmission;
    /**
     * Filters submissions to only those made today (UTC midnight → now).
     * LeetCode timestamps are Unix seconds.
     */
    private filterTodaySubmissions;
    /**
     * Deduplicates submissions by titleSlug, keeping the latest submission
     * for each problem (highest timestamp wins).
     */
    private deduplicateBySlug;
    /**
     * Checks if a problem was reviewed today (UTC).
     */
    private wasReviewedToday;
}
//# sourceMappingURL=SyncSubmissionsUseCase.d.ts.map