/**
 * src/domain/interfaces/IProblemRepository.ts
 *
 * Contract for all LeetCode problem persistence operations.
 */

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface ProblemDto {
  id: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  topicTags: string[];
  companyTags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProblemDto {
  slug: string;
  title: string;
  difficulty: Difficulty;
  topicTags: string[];
  companyTags?: string[];
}

export interface IProblemRepository {
  findById(id: string): Promise<ProblemDto | null>;
  findBySlug(slug: string): Promise<ProblemDto | null>;
  findAll(): Promise<ProblemDto[]>;
  create(data: CreateProblemDto): Promise<ProblemDto>;
  upsertBySlug(data: CreateProblemDto): Promise<ProblemDto>;
  getUnseenProblems(
    userId: string,
    limit: number,
    companyTags?: string[],
    topicTags?: string[],
  ): Promise<ProblemDto[]>;

  /**
   * Search problems by title or slug (case-insensitive partial match).
   * Used for autocomplete in the self-report flow.
   *
   * @param query - Partial title or slug to search for.
   * @param limit - Maximum number of results (default: 10).
   */
  searchByTitle(query: string, limit: number): Promise<ProblemDto[]>;
}
