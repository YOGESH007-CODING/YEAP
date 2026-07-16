"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncSubmissionsUseCase = void 0;
const logger_1 = require("../../shared/utils/logger");
// ─── Constants ───────────────────────────────────────────────────────────────
/** Default number of recent AC submissions to fetch from LeetCode. */
const DEFAULT_FETCH_LIMIT = 50;
// ─── Use Case ─────────────────────────────────────────────────────────────────
class SyncSubmissionsUseCase {
    constructor(deps) {
        this.progressRepo = deps.progressRepository;
        this.problemRepo = deps.problemRepository;
        this.userRepo = deps.userRepository;
        this.leetCodeClient = deps.leetCodeClient;
    }
    /**
     * Sync today's LeetCode accepted submissions for a user.
     *
     * @param userId - Authenticated user's database ID.
     * @returns Structured sync result with newly tracked and existing problems.
     */
    async execute(userId) {
        // ── 1. Fetch user and validate LeetCode username ─────────────────────
        const user = await this.userRepo.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        if (!user.leetcodeUsername) {
            throw new Error('LeetCode username not linked. Please link your LeetCode account first.');
        }
        // ── 2. Fetch recent AC submissions from LeetCode ─────────────────────
        const allSubmissions = await this.leetCodeClient.fetchRecentAcceptedSubmissions(user.leetcodeUsername, DEFAULT_FETCH_LIMIT);
        // ── 3. Filter to today's submissions only (UTC) ──────────────────────
        const todaySubmissions = this.filterTodaySubmissions(allSubmissions);
        logger_1.logger.info(`[SyncSubmissions] User ${userId}: ${allSubmissions.length} total AC submissions, ` +
            `${todaySubmissions.length} from today.`);
        if (todaySubmissions.length === 0) {
            return {
                success: true,
                message: 'No new LeetCode submissions found for today.',
                data: {
                    syncedAt: new Date().toISOString(),
                    totalSubmissionsToday: 0,
                    newlyTracked: [],
                    alreadyTracked: [],
                    pendingQualityScores: [],
                },
            };
        }
        // ── 4. Deduplicate by slug (keep the latest submission per problem) ──
        const uniqueBySlug = this.deduplicateBySlug(todaySubmissions);
        // ── 5. Process each submission ───────────────────────────────────────
        const newlyTracked = [];
        const alreadyTracked = [];
        const pendingQualityScores = [];
        for (const submission of uniqueBySlug) {
            try {
                const result = await this.processSubmission(userId, submission);
                if (result.status === 'newly_tracked') {
                    newlyTracked.push(result);
                    pendingQualityScores.push(result);
                }
                else {
                    alreadyTracked.push(result);
                    // Check if this problem needs a quality score today
                    const progress = await this.progressRepo.findByUserAndProblem(userId, result.problemId);
                    if (progress && !this.wasReviewedToday(progress.lastReviewedAt)) {
                        pendingQualityScores.push(result);
                    }
                }
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                logger_1.logger.warn(`[SyncSubmissions] Failed to process slug="${submission.titleSlug}": ${message}`);
                // Continue processing remaining submissions — don't let one failure block all
            }
        }
        const totalNew = newlyTracked.length;
        const totalExisting = alreadyTracked.length;
        const totalPending = pendingQualityScores.length;
        logger_1.logger.info(`[SyncSubmissions] Sync complete for user ${userId}: ` +
            `${totalNew} newly tracked, ${totalExisting} already tracked, ` +
            `${totalPending} pending quality scores.`);
        return {
            success: true,
            message: totalNew > 0
                ? `Synced ${totalNew} new problem(s) from LeetCode. ${totalPending} problem(s) awaiting quality scores.`
                : `All ${todaySubmissions.length} of today's submissions are already tracked. ${totalPending} problem(s) awaiting quality scores.`,
            data: {
                syncedAt: new Date().toISOString(),
                totalSubmissionsToday: uniqueBySlug.length,
                newlyTracked,
                alreadyTracked,
                pendingQualityScores,
            },
        };
    }
    // ─── Private Helpers ───────────────────────────────────────────────────────
    /**
     * Process a single LeetCode submission:
     *   - Ensure the Problem exists in our DB (upsert via LeetCode metadata)
     *   - Check if user already has a ProblemProgress record
     *   - Create one if missing
     */
    async processSubmission(userId, submission) {
        const submittedAt = new Date(parseInt(submission.timestamp, 10) * 1000).toISOString();
        // ── Ensure Problem exists in DB ──────────────────────────────────────
        let problem = await this.problemRepo.findBySlug(submission.titleSlug);
        if (!problem) {
            // Fetch metadata from LeetCode API and upsert
            logger_1.logger.debug(`[SyncSubmissions] Problem "${submission.titleSlug}" not in DB, fetching metadata...`);
            const metadata = await this.leetCodeClient.fetchProblemMetadata(submission.titleSlug);
            problem = await this.problemRepo.upsertBySlug({
                slug: metadata.slug,
                title: metadata.title,
                difficulty: metadata.difficulty.toUpperCase(),
                topicTags: metadata.tags,
                companyTags: [],
            });
        }
        // ── Check for existing ProblemProgress ────────────────────────────────
        const existingProgress = await this.progressRepo.findByUserAndProblem(userId, problem.id);
        if (existingProgress) {
            return {
                problemId: problem.id,
                slug: problem.slug,
                title: problem.title,
                difficulty: problem.difficulty,
                submittedAt,
                status: 'already_tracked',
            };
        }
        // ── Auto-track: create ProblemProgress with defaults ─────────────────
        await this.progressRepo.findOrCreate(userId, problem.id);
        return {
            problemId: problem.id,
            slug: problem.slug,
            title: problem.title,
            difficulty: problem.difficulty,
            submittedAt,
            status: 'newly_tracked',
        };
    }
    /**
     * Filters submissions to only those made today (UTC midnight → now).
     * LeetCode timestamps are Unix seconds.
     */
    filterTodaySubmissions(submissions) {
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        const todayStartUnix = Math.floor(todayStart.getTime() / 1000);
        return submissions.filter((s) => {
            const ts = parseInt(s.timestamp, 10);
            return ts >= todayStartUnix;
        });
    }
    /**
     * Deduplicates submissions by titleSlug, keeping the latest submission
     * for each problem (highest timestamp wins).
     */
    deduplicateBySlug(submissions) {
        const bySlug = new Map();
        for (const sub of submissions) {
            const existing = bySlug.get(sub.titleSlug);
            if (!existing || parseInt(sub.timestamp, 10) > parseInt(existing.timestamp, 10)) {
                bySlug.set(sub.titleSlug, sub);
            }
        }
        return Array.from(bySlug.values());
    }
    /**
     * Checks if a problem was reviewed today (UTC).
     */
    wasReviewedToday(lastReviewedAt) {
        if (!lastReviewedAt)
            return false;
        const now = new Date();
        const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
        return lastReviewedAt.getTime() >= todayStart.getTime();
    }
}
exports.SyncSubmissionsUseCase = SyncSubmissionsUseCase;
//# sourceMappingURL=SyncSubmissionsUseCase.js.map