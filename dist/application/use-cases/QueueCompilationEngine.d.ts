/**
* src/application/use-cases/QueueCompilationEngine.ts
*
* Builds the daily review queue for all users. The run is organised in phases so
* that every read is a batch query instead of one query per user
* (see PERFORMANCE.md M1/M2/E1/E2/E7):
*
*   1. Load active users once            → userRepository.findActive()
*   2. Seed under-tracked users          → one grouped count + one bulk insert each
*   3. Load the due backlog for everyone → one ranked query + one grouped count
*   4. Load topic mastery for everyone   → one masteryLookup call for the whole run
*   5. Per user: prioritise by EF and weakest-topic mastery, apply the soft cap,
*      and dispatch the bundle to the notification provider.
*
* Phase order matters: seeding creates immediately-due rows, so the backlog read
* in phase 3 must happen after phase 2 for newly seeded problems to appear in the
* same morning's queue.
*
* SOLID Compliance:
*   - SRP: Only handles queue compilation and dispatch.
*   - OCP: New notification providers can be swapped without changing this class.
*   - DIP: Depends on interfaces only — never on Prisma or Telegram/SendGrid directly.
*/
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { INotificationProvider } from '../../domain/interfaces/INotificationProvider';
export interface QueueCompilationEngineDeps {
    progressRepository: IProblemProgressRepository;
    problemRepository: IProblemRepository;
    userRepository: IUserRepository;
    notificationProvider: INotificationProvider;
    /**
     * Resolves topic mastery for the entire run in one call: given the topics due
     * for each user, returns userId → (topicName → mastery score 0-100).
     * Optional so existing callers retain neutral (50) mastery during cold start.
     */
    masteryLookup?: (requests: Array<{
        userId: string;
        topics: string[];
    }>) => Promise<Map<string, Map<string, number>>>;
}
export interface CompilationResult {
    usersProcessed: number;
    totalItemsDispatched: number;
    failures: Array<{
        userId: string;
        error: string;
    }>;
}
export declare class QueueCompilationEngine {
    private readonly progressRepo;
    private readonly problemRepo;
    private readonly userRepo;
    private readonly notificationProvider;
    private readonly masteryLookup?;
    constructor(deps: QueueCompilationEngineDeps);
    /**
     * Execute the morning compilation run.
     * Pulls all overdue items across all users, caps per user, dispatches bundles.
     */
    execute(): Promise<CompilationResult>;
    /**
     * Tops every under-tracked user up to MINIMUM_TRACKED_PROBLEMS with random
     * unseen FAANG problems. Tracked totals come from a single grouped count, and
     * each user's rows are inserted with one bulk insert that skips duplicates
     * (idempotent across worker retries, as findOrCreate was).
     *
     * @returns ids of users whose seeding failed — excluded from dispatch.
     */
    private seedUnderTrackedUsers;
    /** Loads the capped due backlog for all users at once, grouped by userId. */
    private loadDueItemsByUser;
    /** Resolves mastery for every due topic across the run in a single call. */
    private loadMastery;
    private processUserQueue;
}
//# sourceMappingURL=QueueCompilationEngine.d.ts.map