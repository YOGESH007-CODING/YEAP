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

import { SrsEngine } from '../../domain/SrsEngine';
import type { IProblemProgressRepository } from '../../domain/interfaces/IProblemProgressRepository';
import type { IProblemRepository } from '../../domain/interfaces/IProblemRepository';
import type { IUserRepository } from '../../domain/interfaces/IUserRepository';
import type { ILeetCodeClient } from '../../domain/interfaces/ILeetCodeClient';
import type { ReviewSubmitDto, ReviewSubmitResponseDto } from '../dtos/ReviewSubmitDto';

// ─── Dependency Injection Contract ────────────────────────────────────────────

export interface ReviewUseCaseProcessorDeps {
  progressRepository: IProblemProgressRepository;
  problemRepository: IProblemRepository;
  userRepository: IUserRepository;
  leetCodeClient: ILeetCodeClient;
}

// ─── Use Case ─────────────────────────────────────────────────────────────────

export class ReviewUseCaseProcessor {
  private readonly progressRepo: IProblemProgressRepository;
  private readonly problemRepo: IProblemRepository;
  private readonly userRepo: IUserRepository;
  private readonly leetCodeClient: ILeetCodeClient;

  constructor(deps: ReviewUseCaseProcessorDeps) {
    this.progressRepo = deps.progressRepository;
    this.problemRepo = deps.problemRepository;
    this.userRepo = deps.userRepository;
    this.leetCodeClient = deps.leetCodeClient;
  }

  /**
   * Process a review submission from a user.
   *
   * @param userId - Authenticated user's database ID.
   * @param dto    - Validated review payload (problemId + qualityScore).
   * @param verifyWithLeetCode - If true, cross-checks submission via LeetCode GraphQL.
   */
  async execute(
    userId: string,
    dto: ReviewSubmitDto,
    verifyWithLeetCode = false,
  ): Promise<ReviewSubmitResponseDto> {
    // ── 1. Fetch the problem from DB ─────────────────────────────────────
    const problem = await this.problemRepo.findById(dto.problemId);
    if (!problem) {
      throw new Error(`Problem not found: ${dto.problemId}`);
    }

    // ── 2. Optional LeetCode verification ────────────────────────────────
    if (verifyWithLeetCode) {
      const user = await this.userRepo.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      if (!user.leetcodeUsername) {
        throw new Error('LeetCode username not linked');
      }

      const verified = await this.leetCodeClient.verifyUserSubmission(
        user.leetcodeUsername,
        problem.slug,
      );

      if (!verified) {
        throw new Error('LeetCode submission verification failed');
      }
    }

    // ── 3. Atomically read SM-2 state, compute next review, and persist ───
    //    Uses SELECT ... FOR UPDATE inside a transaction to prevent
    //    concurrent submits from computing on stale state (lost-update race).
    const now = new Date();
    const updatedProgress = await this.progressRepo.atomicFindAndUpdate(
      userId,
      dto.problemId,
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

    // ── 6. Return structured response DTO ────────────────────────────────
    return {
      success: true,
      message: `Review submitted. Next review scheduled in ${updatedProgress.intervalDays} day(s).`,
      data: {
        problemId: problem.id,
        problemTitle: problem.title,
        newInterval: updatedProgress.intervalDays,
        newEasinessFactor: updatedProgress.easinessFactor,
        nextDueDate: updatedProgress.dueDate.toISOString(),
        repetitions: updatedProgress.repetitions,
        qualityScore: dto.qualityScore,
      },
    };
  }
}
