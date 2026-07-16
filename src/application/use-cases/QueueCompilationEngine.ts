/**
 * src/application/use-cases/QueueCompilationEngine.ts
 *
 * Builds the daily review queue for all users:
 *   1. Queries all due progress items (dueDate <= now)
 *   2. Groups by user
 *   3. Sorts each user's items by EF ascending (sinking EF = most critical)
 *   4. Applies a strict soft-cap of MAX 5 items per user
 *   5. Sends the compiled bundle to the notification provider
 *
 * SOLID Compliance:
 *   - SRP: Only handles queue compilation and dispatch.
 *   - OCP: New notification providers can be swapped without changing this class.
 *   - DIP: Depends on interfaces only — never on Prisma or Telegram/SendGrid directly.
 */

import type { IProblemProgressRepository, DueProgressWithProblem } from '../../domain/interfaces/IProblemProgressRepository';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type {
  INotificationProvider,
  DailyBundle,
  ReviewItem,
} from '../../domain/interfaces/INotificationProvider';
import { logger } from '../../shared/utils/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Maximum number of items dispatched to any single user per morning run. */
const BACKLOG_SOFT_CAP = 5;

/** Items with EF below this are considered "critical" and flagged in the bundle. */
const CRITICAL_EF_THRESHOLD = 1.8;

// ─── Dependency Injection Contract ────────────────────────────────────────────

export interface QueueCompilationEngineDeps {
  progressRepository: IProblemProgressRepository;
  problemRepository: IProblemRepository;
  userRepository: IUserRepository;
  notificationProvider: INotificationProvider;
}

// ─── Result Types ─────────────────────────────────────────────────────────────

export interface CompilationResult {
  usersProcessed: number;
  totalItemsDispatched: number;
  failures: Array<{ userId: string; error: string }>;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class QueueCompilationEngine {
  private readonly progressRepo: IProblemProgressRepository;
  private readonly problemRepo: IProblemRepository;
  private readonly userRepo: IUserRepository;
  private readonly notificationProvider: INotificationProvider;

  constructor(deps: QueueCompilationEngineDeps) {
    this.progressRepo = deps.progressRepository;
    this.problemRepo = deps.problemRepository;
    this.userRepo = deps.userRepository;
    this.notificationProvider = deps.notificationProvider;
  }

  /**
   * Execute the morning compilation run.
   * Pulls all overdue items across all users, caps per user, dispatches bundles.
   */
  async execute(): Promise<CompilationResult> {
    logger.info('[QueueCompilationEngine] Starting morning queue compilation...');

    const result: CompilationResult = {
      usersProcessed: 0,
      totalItemsDispatched: 0,
      failures: [],
    };

    // ── 1. Pull all due items from DB (indexed query on dueDate) ─────────
    // The repository handles grouping efficiently; we fetch with a generous
    // per-user limit and apply the final cap here in application logic.
    const allDueItems = await this.progressRepo.findAllDue(BACKLOG_SOFT_CAP * 2);

    if (allDueItems.length === 0) {
      logger.info('[QueueCompilationEngine] No due items found. Nothing to dispatch.');
      return result;
    }

    // ── 2. Group by userId ────────────────────────────────────────────────
    const byUser = this.groupByUser(allDueItems);
    logger.info(`[QueueCompilationEngine] Found due items for ${byUser.size} users.`);

    // ── 3. Process each user's queue ──────────────────────────────────────
    for (const [userId, items] of byUser.entries()) {
      try {
        await this.processUserQueue(userId, items, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`[QueueCompilationEngine] Failed for user ${userId}: ${message}`);
        result.failures.push({ userId, error: message });
      }
    }

    logger.info(
      `[QueueCompilationEngine] Complete. ` +
      `Users: ${result.usersProcessed}, ` +
      `Items: ${result.totalItemsDispatched}, ` +
      `Failures: ${result.failures.length}`,
    );

    return result;
  }

  // ─── Private Helpers ───────────────────────────────────────────────────────

  private async processUserQueue(
    userId: string,
    rawItems: DueProgressWithProblem[],
    result: CompilationResult,
  ): Promise<void> {
    // Sort ascending by easinessFactor — lowest EF = most critical = process first
    const sorted = [...rawItems].sort(
      (a, b) => a.easinessFactor - b.easinessFactor,
    );

    // Apply strict backlog soft-cap
    const capped = sorted.slice(0, BACKLOG_SOFT_CAP);

    // Fetch user profile for notification targeting
    const user = await this.userRepo.findById(userId);
    if (!user) {
      logger.warn(`[QueueCompilationEngine] User ${userId} not found, skipping.`);
      return;
    }

    // Determine notification target
    const target = user.email;
    if (!target) {
      logger.warn(`[QueueCompilationEngine] No notification target for user ${userId}.`);
      return;
    }

    // Build the review items list
    const reviewItems: ReviewItem[] = capped.map((item) => ({
      problemSlug: item.problem.slug,
      problemTitle: item.problem.title,
      difficulty: item.problem.difficulty,
      dueDate: item.dueDate,
      easinessFactor: item.easinessFactor,
      intervalDays: item.intervalDays,
    }));

    const bonusItems: ReviewItem[] = [];
    if (reviewItems.length < BACKLOG_SOFT_CAP) {
      const needed = BACKLOG_SOFT_CAP - reviewItems.length;
      const bonusProblems = await this.problemRepo.getUnseenProblems(
        userId,
        needed,
        ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'],
      );

      for (const problem of bonusProblems) {
        bonusItems.push({
          problemSlug: problem.slug,
          problemTitle: problem.title,
          difficulty: problem.difficulty,
          dueDate: new Date(),
          easinessFactor: 0,
          intervalDays: 0,
          isNewChallenge: true,
        });
      }
    }

    const allReviewItems = [...reviewItems, ...bonusItems];
    const criticalCount = allReviewItems.filter(
      (i) => i.easinessFactor < CRITICAL_EF_THRESHOLD,
    ).length;

    // Build the daily bundle
    const bundle: DailyBundle = {
      userId,
      recipientName: user.name ?? user.email,
      reviewItems: allReviewItems,
      totalDue: rawItems.length,
      criticalCount,
    };

    // Dispatch via notification provider (Telegram/SendGrid/Mock)
    const notifResult = await this.notificationProvider.sendDailyBundle(bundle, target);

    if (notifResult.success) {
      result.usersProcessed++;
      result.totalItemsDispatched += allReviewItems.length;
      logger.info(
        `[QueueCompilationEngine] Dispatched ${allReviewItems.length} items to user ${userId} ` +
        `(${criticalCount} critical, ${rawItems.length} total due).`,
      );
    } else {
      throw new Error(`Notification failed: ${notifResult.error ?? 'Unknown error'}`);
    }
  }

  private groupByUser(
    items: DueProgressWithProblem[],
  ): Map<string, DueProgressWithProblem[]> {
    const map = new Map<string, DueProgressWithProblem[]>();
    for (const item of items) {
      const existing = map.get(item.userId) ?? [];
      existing.push(item);
      map.set(item.userId, existing);
    }
    return map;
  }
}
