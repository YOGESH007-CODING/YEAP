"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueCompilationEngine = void 0;
const logger_1 = require("../../shared/utils/logger");
// ─── Constants ───────────────────────────────────────────────────────────────
/** Maximum number of items dispatched to any single user per morning run. */
const BACKLOG_SOFT_CAP = 5;
/** Each user is automatically seeded until they track this many problems. */
const MINIMUM_TRACKED_PROBLEMS = 5;
const FAANG_COMPANIES = ['Amazon', 'Google', 'Meta', 'Microsoft', 'Apple'];
/** Items with EF below this are considered "critical" and flagged in the bundle. */
const CRITICAL_EF_THRESHOLD = 1.8;
/** Maximum number of users processed concurrently by a single daily worker. */
const USER_PROCESSING_CONCURRENCY = 25;
/**
 * Per-user ceiling on due rows loaded into memory for prioritisation.
 *
 * Only BACKLOG_SOFT_CAP (5) items are ever dispatched, but priority is computed
 * across the whole backlog so a weak-topic item further down the EF list can still
 * surface. This cap keeps a pathological backlog from ballooning worker memory
 * while staying far above any realistic daily backlog. The bundle's `totalDue`
 * comes from a separate exact COUNT, so raising or lowering this never changes
 * the number a user sees.
 */
const DUE_ITEMS_LOADED_PER_USER = 200;
// ─── Engine ───────────────────────────────────────────────────────────────────
class QueueCompilationEngine {
    constructor(deps) {
        this.progressRepo = deps.progressRepository;
        this.problemRepo = deps.problemRepository;
        this.userRepo = deps.userRepository;
        this.notificationProvider = deps.notificationProvider;
        this.masteryLookup = deps.masteryLookup;
    }
    /**
     * Execute the morning compilation run.
     * Pulls all overdue items across all users, caps per user, dispatches bundles.
     */
    async execute() {
        logger_1.logger.info('[QueueCompilationEngine] Starting morning queue compilation...');
        const result = {
            usersProcessed: 0,
            totalItemsDispatched: 0,
            failures: [],
        };
        // Every active user is checked so a new user with no progress is seeded too.
        // Soft-deleted accounts are excluded — they must not receive notifications.
        const users = await this.userRepo.findActive();
        logger_1.logger.info(`[QueueCompilationEngine] Checking queues for ${users.length} active users.`);
        if (users.length === 0) {
            return result;
        }
        // Phase 2 — seed anyone below the minimum. Users whose seeding failed are
        // skipped for the rest of the run, matching the previous per-user behaviour.
        const seedFailures = await this.seedUnderTrackedUsers(users, result);
        // Phase 3 — the whole due backlog in one query, plus exact per-user totals.
        const [dueByUser, dueCounts] = await Promise.all([
            this.loadDueItemsByUser(),
            this.progressRepo.countDueGroupedByUser(),
        ]);
        const pending = users.filter((user) => !seedFailures.has(user.id) && (dueByUser.get(user.id)?.length ?? 0) > 0);
        // Phase 4 — one mastery lookup covering every user due today.
        const masteryByUser = await this.loadMastery(pending, dueByUser);
        // Phase 5 — compile and dispatch per user, bounded concurrency.
        for (let start = 0; start < pending.length; start += USER_PROCESSING_CONCURRENCY) {
            const batch = pending.slice(start, start + USER_PROCESSING_CONCURRENCY);
            await Promise.all(batch.map(async (user) => {
                const items = dueByUser.get(user.id) ?? [];
                try {
                    await this.processUserQueue(user, items, dueCounts.get(user.id) ?? items.length, masteryByUser.get(user.id) ?? new Map(), result);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger_1.logger.error(`[QueueCompilationEngine] Failed for user ${user.id}: ${message}`);
                    result.failures.push({ userId: user.id, error: message });
                }
            }));
        }
        logger_1.logger.info(`[QueueCompilationEngine] Complete. ` +
            `Users: ${result.usersProcessed}, ` +
            `Items: ${result.totalItemsDispatched}, ` +
            `Failures: ${result.failures.length}`);
        return result;
    }
    // ─── Private Helpers ───────────────────────────────────────────────────────
    /**
     * Tops every under-tracked user up to MINIMUM_TRACKED_PROBLEMS with random
     * unseen FAANG problems. Tracked totals come from a single grouped count, and
     * each user's rows are inserted with one bulk insert that skips duplicates
     * (idempotent across worker retries, as findOrCreate was).
     *
     * @returns ids of users whose seeding failed — excluded from dispatch.
     */
    async seedUnderTrackedUsers(users, result) {
        const failures = new Set();
        const trackedCounts = await this.progressRepo.countGroupedByUser(users.map((user) => user.id));
        const needy = users.filter((user) => MINIMUM_TRACKED_PROBLEMS - (trackedCounts.get(user.id) ?? 0) > 0);
        if (needy.length === 0) {
            return failures;
        }
        for (let start = 0; start < needy.length; start += USER_PROCESSING_CONCURRENCY) {
            const batch = needy.slice(start, start + USER_PROCESSING_CONCURRENCY);
            await Promise.all(batch.map(async (user) => {
                const tracked = trackedCounts.get(user.id) ?? 0;
                const required = MINIMUM_TRACKED_PROBLEMS - tracked;
                try {
                    const unseen = await this.problemRepo.getUnseenProblems(user.id, required, FAANG_COMPANIES);
                    if (unseen.length > 0) {
                        await this.progressRepo.createManyForUser(user.id, unseen.map((problem) => problem.id));
                    }
                    logger_1.logger.info(`[QueueCompilationEngine] Added ${unseen.length} unseen FAANG problems ` +
                        `for user ${user.id} (${tracked + unseen.length}/${MINIMUM_TRACKED_PROBLEMS} tracked).`);
                }
                catch (error) {
                    const message = error instanceof Error ? error.message : String(error);
                    logger_1.logger.error(`[QueueCompilationEngine] Failed for user ${user.id}: ${message}`);
                    result.failures.push({ userId: user.id, error: message });
                    failures.add(user.id);
                }
            }));
        }
        return failures;
    }
    /** Loads the capped due backlog for all users at once, grouped by userId. */
    async loadDueItemsByUser() {
        const rows = await this.progressRepo.findAllDue(DUE_ITEMS_LOADED_PER_USER);
        const byUser = new Map();
        for (const row of rows) {
            const existing = byUser.get(row.userId);
            if (existing) {
                existing.push(row);
            }
            else {
                byUser.set(row.userId, [row]);
            }
        }
        return byUser;
    }
    /** Resolves mastery for every due topic across the run in a single call. */
    async loadMastery(users, dueByUser) {
        const lookup = this.masteryLookup;
        if (!lookup) {
            return new Map();
        }
        const requests = users.flatMap((user) => {
            const items = dueByUser.get(user.id) ?? [];
            const topics = [...new Set(items.flatMap((item) => item.problem.topicTags))];
            return topics.length > 0 ? [{ userId: user.id, topics }] : [];
        });
        if (requests.length === 0) {
            return new Map();
        }
        return lookup(requests);
    }
    async processUserQueue(user, rawItems, totalDue, mastery, result) {
        // Priority must be calculated before capping: pre-filtering by EF would
        // prevent a weak-topic item farther down the EF list from surfacing.
        const priorityScore = (item) => {
            // SM-2's practical EF range is 1.3–2.5. Clamp defensive outliers.
            const normalizedEF = Math.max(0, Math.min(1, (item.easinessFactor - 1.3) / 1.2));
            const topicMasteries = item.problem.topicTags.map((topic) => mastery.get(topic) ?? 50);
            const weakestMastery = topicMasteries.length ? Math.min(...topicMasteries) : 50;
            return (1 - normalizedEF) * 0.6 + (1 - weakestMastery / 100) * 0.4;
        };
        const sorted = [...rawItems].sort((a, b) => priorityScore(b) - priorityScore(a) || a.dueDate.getTime() - b.dueDate.getTime());
        // Apply strict backlog soft-cap
        const capped = sorted.slice(0, BACKLOG_SOFT_CAP);
        // Determine notification target. The user profile was loaded once for the
        // whole run, so there is no per-user re-fetch here.
        const target = user.email;
        if (!target) {
            logger_1.logger.warn(`[QueueCompilationEngine] No notification target for user ${user.id}.`);
            return;
        }
        // Build the review items list
        const reviewItems = capped.map((item) => ({
            problemSlug: item.problem.slug,
            problemTitle: item.problem.title,
            difficulty: item.problem.difficulty,
            dueDate: item.dueDate,
            easinessFactor: item.easinessFactor,
            intervalDays: item.intervalDays,
        }));
        const bonusItems = [];
        if (reviewItems.length < BACKLOG_SOFT_CAP) {
            const needed = BACKLOG_SOFT_CAP - reviewItems.length;
            const bonusProblems = await this.problemRepo.getUnseenProblems(user.id, needed, FAANG_COMPANIES);
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
        const criticalCount = reviewItems.filter((i) => i.easinessFactor < CRITICAL_EF_THRESHOLD).length;
        // Build the daily bundle
        const bundle = {
            userId: user.id,
            recipientName: user.name ?? user.email,
            reviewItems: allReviewItems,
            totalDue,
            criticalCount,
        };
        // Dispatch via notification provider (Telegram/SendGrid/Mock)
        const notifResult = await this.notificationProvider.sendDailyBundle(bundle, target);
        if (notifResult.success) {
            result.usersProcessed++;
            result.totalItemsDispatched += allReviewItems.length;
            logger_1.logger.info(`[QueueCompilationEngine] Dispatched ${allReviewItems.length} items to user ${user.id} ` +
                `(${criticalCount} critical, ${totalDue} total due).`);
        }
        else {
            throw new Error(`Notification failed: ${notifResult.error ?? 'Unknown error'}`);
        }
    }
}
exports.QueueCompilationEngine = QueueCompilationEngine;
//# sourceMappingURL=QueueCompilationEngine.js.map