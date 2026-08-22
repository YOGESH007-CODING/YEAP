/**
 * src/infrastructure/web/controllers/ReviewController.ts
 *
 * HTTP controller for review submission.
 * Responsibilities:
 *   1. Unpack and validate the request body (via Zod)
 *   2. Compose dependencies and delegate to ReviewUseCaseProcessor
 *   3. Return structured JSON responses with appropriate HTTP status codes
 *
 * SOLID Compliance:
 *   - SRP: Only handles HTTP layer concerns (parse, validate, respond).
 *   - DIP: Receives concrete dependencies from outside (route setup).
 */
import type { Request, Response } from 'express';
export declare const ReviewController: {
    /**
     * POST /api/review/submit
     *
     * Submit a review result for a LeetCode problem.
     * The body must include: { problemId: string, qualityScore: number (0-5) }
     */
    submit(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/review/due
     *
     * Returns the list of due problems for the authenticated user.
     */
    getDue(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/review/track
     *
     * Initialize tracking for a problem without immediately submitting a quality score.
     */
    track(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/review/sync
     *
     * Auto-detect today's LeetCode accepted submissions, auto-track new problems,
     * and return the list of problems awaiting quality scores.
     */
    sync(req: Request, res: Response): Promise<void>;
    /**
     * POST /api/review/report
     *
     * Self-report flow: user provides a problem slug + quality score.
     * Zero external API calls — all local DB queries.
     * Body: { problemSlug: string, qualityScore: 0-5 }
     */
    report(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/problems/search?q=two-sum
     *
     * Search problems by title or slug for autocomplete.
     * Zero external API calls — queries our seeded 3977-problem DB.
     */
    searchProblems(req: Request, res: Response): Promise<void>;
    getProblem(req: Request, res: Response): Promise<void>;
    /**
     * GET /api/review/history
     *
     * Returns the authenticated user's tracked problems (no due-date filter),
     * ordered by dueDate ASC.
     *
     * Pagination is **opt-in and backward-compatible** (PERFORMANCE.md M6):
     *   • No `limit` query param → returns the full list, exactly as before.
     *   • `?limit=N` (optionally `&offset=M`) → returns one page plus
     *     `limit`, `offset`, and `hasMore` metadata so the client can page.
     * In both modes `count` is the user's total tracked-problem count.
     */
    getHistory(req: Request, res: Response): Promise<void>;
};
//# sourceMappingURL=ReviewController.d.ts.map