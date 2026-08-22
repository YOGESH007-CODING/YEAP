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

import { SrsEngine } from '../../domain/SrsEngine';
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { ReportDto, ReportResponseDto } from '../dtos/ReportDto';

// ─── Dependency Injection Contract ────────────────────────────────────────────

export interface ReportProblemUseCaseDeps {
  progressRepository: IProblemProgressRepository;
  problemRepository: IProblemRepository;
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class ReportProblemUseCase {
  private readonly progressRepo: IProblemProgressRepository;
  private readonly problemRepo: IProblemRepository;

  constructor(deps: ReportProblemUseCaseDeps) {
    this.progressRepo = deps.progressRepository;
    this.problemRepo = deps.problemRepository;
  }

  /**
   * Process a self-reported problem completion.
   *
   * @param userId - Authenticated user's database ID.
   * @param dto    - Validated report payload (problemSlug + qualityScore).
   */
  async execute(userId: string, dto: ReportDto): Promise<ReportResponseDto> {
    // ── 1. Find problem by slug ──────────────────────────────────────────
    const problem = await this.problemRepo.findBySlug(dto.problemSlug);
    if (!problem) {
      throw new Error(`Problem not found: "${dto.problemSlug}". Check the slug and try again.`);
    }

    // ── 2. Atomically read SM-2 state, compute next review, and persist ──
    const now = new Date();
    const updatedProgress = await this.progressRepo.atomicFindAndUpdate(
      userId,
      problem.id,
      (current) => {
        const currentState = {
          repetitions: current.repetitions,
          easinessFactor: current.easinessFactor,
          intervalDays: current.intervalDays,
        };

        const result = SrsEngine.calculateNextReview(currentState, dto.qualityScore);

        return {
          repetitions: result.repetitions,
          easinessFactor: result.easinessFactor,
          intervalDays: result.intervalDays,
          dueDate: result.nextDueDate,
          lastReviewedAt: now,
        };
      },
    );

    // ── 3. Return structured response ────────────────────────────────────
    return {
      success: true,
      message: `Review submitted for "${problem.title}". Next review in ${updatedProgress.intervalDays} day(s).`,
      data: {
        problemId: problem.id,
        problemSlug: problem.slug,
        problemTitle: problem.title,
        topicTags: problem.topicTags,
        difficulty: problem.difficulty,
        newInterval: updatedProgress.intervalDays,
        newEasinessFactor: updatedProgress.easinessFactor,
        nextDueDate: updatedProgress.dueDate.toISOString(),
        repetitions: updatedProgress.repetitions,
        qualityScore: dto.qualityScore,
      },
    };
  }
}
