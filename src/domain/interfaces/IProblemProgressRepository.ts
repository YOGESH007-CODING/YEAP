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
   * Grouped and capped per-user at `perUserLimit` (ranked by EF ASC, dueDate ASC).
   * A limit of 0 means "no cap", matching findDueByUser's convention.
   */
  findAllDue(perUserLimit: number): Promise<DueProgressWithProblem[]>;

  /**
   * Counts tracked problems for many users in a single grouped query.
   * Returns userId → count; users with no rows are absent from the map.
   * The daily worker uses this to decide who needs seeding without issuing
   * one query per user. See PERFORMANCE.md M1.
   */
  countGroupedByUser(userIds: string[]): Promise<Map<string, number>>;

  /**
   * Counts *due* items (dueDate <= now) per user in a single grouped query.
   * Returns userId → count; users with nothing due are absent from the map.
   * Lets the worker report an exact backlog total even though it only loads a
   * capped slice of each user's due rows. See PERFORMANCE.md M1.
   */
  countDueGroupedByUser(): Promise<Map<string, number>>;

  /**
   * Bulk-creates progress rows for one user, skipping any that already exist.
   * Replaces a sequential findOrCreate loop with one INSERT. Returns the number
   * of rows actually inserted. See PERFORMANCE.md M2.
   */
  createManyForUser(userId: string, problemIds: string[]): Promise<number>;

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

  /**
   * Paginated variant of findAllByUser: returns one page ordered by dueDate ASC.
   * Lets the history endpoint bound its payload instead of shipping every tracked
   * row on each load. Combine with countByUser for a total. See PERFORMANCE.md M6.
   */
  findPageByUser(userId: string, limit: number, offset: number): Promise<DueProgressWithProblem[]>;

  /**
   * Counts a user's tracked problems without materializing any rows or joins.
   * Use this whenever only a total is needed (e.g. dashboard "totalTracked");
   * it runs an index-only COUNT instead of fetching every row + problem join.
   */
  countByUser(userId: string): Promise<number>;
}
