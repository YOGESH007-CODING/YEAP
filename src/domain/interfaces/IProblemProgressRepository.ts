/**
 * src/domain/interfaces/IProblemProgressRepository.ts
 *
 * Contract for all SM-2 state (ProblemProgress) persistence operations.
 * This is the most critical repository — it holds the SRS scheduling state.
 */

export interface ProblemProgressDto {
  id: string;
  userId: string;
  problemId: string;
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
  dueDate: Date;
  lastReviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProgressDto {
  userId: string;
  problemId: string;
  repetitions?: number;
  easinessFactor?: number;
  intervalDays?: number;
  dueDate?: Date;
}

export interface UpdateProgressDto {
  repetitions: number;
  easinessFactor: number;
  intervalDays: number;
  dueDate: Date;
  lastReviewedAt: Date;
}

export interface DueProgressWithProblem extends ProblemProgressDto {
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    topicTags: string[];
    companyTags: string[];
  };
}

export interface IProblemProgressRepository {
  findByUserAndProblem(userId: string, problemId: string): Promise<ProblemProgressDto | null>;
  findOrCreate(userId: string, problemId: string): Promise<ProblemProgressDto>;
  update(id: string, data: UpdateProgressDto): Promise<ProblemProgressDto>;

  /**
   * Fetches all due items for a specific user where dueDate <= now.
   * Uses the DB index on dueDate for efficient queries.
   * A limit of 0 returns the complete due backlog, used when the caller must
   * apply an in-memory priority rule before capping results.
   */
  findDueByUser(userId: string, limit: number): Promise<DueProgressWithProblem[]>;

  /**
   * Fetches all due items across all users — used by the daily queue worker.
   * Grouped and capped per-user at `perUserLimit`.
   */
  findAllDue(perUserLimit: number): Promise<DueProgressWithProblem[]>;

  /**
   * Atomically reads the current SM-2 state for a user+problem, applies
   * an update callback, and persists the result — all inside a serialized
   * transaction to prevent lost-update races on concurrent submits.
   */
  atomicFindAndUpdate(
    userId: string,
    problemId: string,
    updater: (current: ProblemProgressDto) => UpdateProgressDto,
  ): Promise<ProblemProgressDto>;

  /**
   * Fetches ALL tracked problems for a user (no due-date filter).
   * Used by the history page. Sorted by dueDate ASC (most urgent first).
   */
  findAllByUser(userId: string): Promise<DueProgressWithProblem[]>;
}
