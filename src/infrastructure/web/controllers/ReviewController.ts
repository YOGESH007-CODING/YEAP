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
import { ZodError } from 'zod';
import { ReviewSubmitSchema, ReviewTrackSchema } from '../../../application/dtos/ReviewSubmitDto';
import { ReportSchema } from '../../../application/dtos/ReportDto';
import { ReviewUseCaseProcessor } from '../../../application/use-cases/ReviewUseCaseProcessor';
import { ReportProblemUseCase } from '../../../application/use-cases/ReportProblemUseCase';
import { SyncSubmissionsUseCase } from '../../../application/use-cases/SyncSubmissionsUseCase';
import { prisma } from '../../database/prismaClient';
import { PrismaProblemProgressRepository } from '../../repositories/PrismaProblemProgressRepository';
import { PrismaProblemRepository } from '../../repositories/PrismaProblemRepository';
import { PrismaUserRepository } from '../../repositories/PrismaUserRepository';
import { LeetCodeGraphQLClient } from '../../external/LeetCodeGraphQLClient';
import { logger } from '../../../shared/utils/logger';

// ─── Dependency Composition ───────────────────────────────────────────────────
// Assembled once — repositories are stateless adapters, safe to reuse.

const progressRepository = new PrismaProblemProgressRepository(prisma);
const problemRepository = new PrismaProblemRepository(prisma);
const userRepository = new PrismaUserRepository(prisma);
const leetCodeClient = new LeetCodeGraphQLClient();

const reviewProcessor = new ReviewUseCaseProcessor({
  progressRepository,
  problemRepository,
  userRepository,
  leetCodeClient,
});

const syncProcessor = new SyncSubmissionsUseCase({
  progressRepository,
  problemRepository,
  userRepository,
  leetCodeClient,
});

const reportProcessor = new ReportProblemUseCase({
  progressRepository,
  problemRepository,
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const ReviewController = {
  /**
   * POST /api/review/submit
   *
   * Submit a review result for a LeetCode problem.
   * The body must include: { problemId: string, qualityScore: number (0-5) }
   */
  async submit(req: Request, res: Response): Promise<void> {
    // ── 1. Ensure authentication ────────────────────────────────────────
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    // ── 2. Validate request body with Zod ───────────────────────────────
    const parseResult = ReviewSubmitSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = (parseResult.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: issues,
      });
      return;
    }

    // ── 3. Execute use case ──────────────────────────────────────────────
    try {
      const verifyWithLeetCode = req.body.verifyWithLeetCode === true;
      const result = await reviewProcessor.execute(req.userId, parseResult.data, verifyWithLeetCode);

      logger.info(
        `[ReviewController] User ${req.userId} reviewed problem ${parseResult.data.problemId} ` +
        `with quality=${parseResult.data.qualityScore} (verified=${verifyWithLeetCode}). ` +
        `Next due: ${result.data.nextDueDate}`,
      );

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] submit error: ${message}`);

      // LeetCode verification or missing username errors → 400 Bad Request
      if (
        message.includes('verification failed') ||
        message.includes('not linked')
      ) {
        res.status(400).json({ success: false, error: message });
        return;
      }

      // Domain errors (e.g., "Problem not found") → 404
      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }

      // Range errors (e.g., invalid quality score) → 400
      if (error instanceof RangeError) {
        res.status(400).json({ success: false, error: message });
        return;
      }

      // Unexpected errors → 500
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * GET /api/review/due
   *
   * Returns the list of due problems for the authenticated user.
   */
  async getDue(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const dueItems = await progressRepository.findDueByUser(req.userId, 20);
      const allTracked = await progressRepository.findAllByUser(req.userId);

      res.status(200).json({
        success: true,
        data: {
          count: dueItems.length,
          totalTracked: allTracked.length,
          items: dueItems.map((item) => ({
            progressId: item.id,
            problem: item.problem,
            easinessFactor: item.easinessFactor,
            intervalDays: item.intervalDays,
            repetitions: item.repetitions,
            dueDate: item.dueDate.toISOString(),
            lastReviewedAt: item.lastReviewedAt?.toISOString() ?? null,
          })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] getDue error: ${message}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * POST /api/review/track
   *
   * Initialize tracking for a problem without immediately submitting a quality score.
   */
  async track(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = ReviewTrackSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = (parseResult.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: issues,
      });
      return;
    }

    try {
      // Ensure the problem actually exists
      const problem = await problemRepository.findById(parseResult.data.problemId);
      if (!problem) {
        res.status(404).json({ success: false, error: `Problem not found: ${parseResult.data.problemId}` });
        return;
      }

      const progress = await progressRepository.findOrCreate(req.userId, parseResult.data.problemId);

      res.status(200).json({
        success: true,
        message: 'Problem added to review queue.',
        data: {
          progressId: progress.id,
          problemId: progress.problemId,
          dueDate: progress.dueDate.toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] track error: ${message}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * POST /api/review/sync
   *
   * Auto-detect today's LeetCode accepted submissions, auto-track new problems,
   * and return the list of problems awaiting quality scores.
   */
  async sync(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const result = await syncProcessor.execute(req.userId);

      logger.info(
        `[ReviewController] Sync for user ${req.userId}: ` +
        `${result.data.newlyTracked.length} new, ` +
        `${result.data.alreadyTracked.length} existing, ` +
        `${result.data.pendingQualityScores.length} pending.`,
      );

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] sync error: ${message}`);

      if (message.includes('not linked') || message.includes('not found')) {
        res.status(400).json({ success: false, error: message });
        return;
      }

      if (message.includes('LeetCode API')) {
        res.status(502).json({ success: false, error: message });
        return;
      }

      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * POST /api/review/report
   *
   * Self-report flow: user provides a problem slug + quality score.
   * Zero external API calls — all local DB queries.
   * Body: { problemSlug: string, qualityScore: 0-5 }
   */
  async report(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const parseResult = ReportSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issues = (parseResult.error as ZodError).issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: issues,
      });
      return;
    }

    try {
      const result = await reportProcessor.execute(req.userId, parseResult.data);

      logger.info(
        `[ReviewController] User ${req.userId} reported problem "${parseResult.data.problemSlug}" ` +
        `with quality=${parseResult.data.qualityScore}. Next due: ${result.data.nextDueDate}`,
      );

      res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] report error: ${message}`);

      if (message.includes('not found')) {
        res.status(404).json({ success: false, error: message });
        return;
      }

      if (error instanceof RangeError) {
        res.status(400).json({ success: false, error: message });
        return;
      }

      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  /**
   * GET /api/problems/search?q=two-sum
   *
   * Search problems by title or slug for autocomplete.
   * Zero external API calls — queries our seeded 3977-problem DB.
   */
  async searchProblems(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const query = (req.query['q'] as string ?? '').trim();
    if (query.length < 2) {
      res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters.',
      });
      return;
    }

    try {
      const requestedLimit = req.query['limit'] === undefined ? 10 : Number(req.query['limit']);
      if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
        res.status(400).json({ success: false, error: 'limit must be a positive integer.' });
        return;
      }
      const limit = Math.min(requestedLimit, 25);
      const problems = await problemRepository.searchByTitle(query, limit);

      res.status(200).json({
        success: true,
        data: {
          query,
          count: problems.length,
          problems: problems.map((p) => ({
            id: p.id,
            slug: p.slug,
            title: p.title,
            difficulty: p.difficulty,
            topicTags: p.topicTags,
          })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] searchProblems error: ${message}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getProblem(req: Request, res: Response): Promise<void> {
    if (!req.userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }
    const problem = await problemRepository.findBySlug(req.params['slug']);
    if (!problem) { res.status(404).json({ success: false, error: 'Problem not found' }); return; }
    res.json({ success: true, data: problem });
  },

  /**
   * GET /api/review/history
   *
   * Returns ALL tracked problems for the authenticated user (no due-date filter).
   * The frontend handles filtering/sorting client-side.
   */
  async getHistory(req: Request, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const items = await progressRepository.findAllByUser(req.userId);

      res.status(200).json({
        success: true,
        data: {
          count: items.length,
          items: items.map((item) => ({
            progressId: item.id,
            problem: item.problem,
            easinessFactor: item.easinessFactor,
            intervalDays: item.intervalDays,
            repetitions: item.repetitions,
            dueDate: item.dueDate.toISOString(),
            lastReviewedAt: item.lastReviewedAt?.toISOString() ?? null,
          })),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Internal server error';
      logger.error(`[ReviewController] getHistory error: ${message}`);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
