/**
* src/application/use-cases/QueueCompilationEngine.ts
*
* Builds the daily review queue for all users:
*   1. Queries all due progress items (dueDate <= now)
*   2. Groups by user
*   3. Prioritizes due items using EF and weakest-topic mastery
*   4. Applies a strict soft-cap of MAX 5 items per user
*   5. Sends the compiled bundle to the notification provider
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
    /** Optional so existing callers retain neutral (50) mastery during cold start. */
    masteryLookup?: (userId: string, topics: string[]) => Promise<Map<string, number>>;
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
    private processUser;
    /**
     * Adds random unseen FAANG problems only until a user has five tracked
     * problems. findOrCreate keeps the insert idempotent across retries.
     */
    private seedMinimumQueue;
    private processUserQueue;
}
//# sourceMappingURL=QueueCompilationEngine.d.ts.map