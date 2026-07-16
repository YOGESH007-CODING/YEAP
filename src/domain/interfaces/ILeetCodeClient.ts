/**
 * src/domain/interfaces/ILeetCodeClient.ts
 *
 * Contract for all LeetCode external API interactions.
 * The concrete implementation lives in src/infrastructure/external/.
 */

export interface LeetCodeSubmission {
  titleSlug: string;
  statusDisplay: string; // e.g., "Accepted", "Wrong Answer"
  timestamp: string;
  lang: string;
}

export interface LeetCodeProblemMetadata {
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  tags: string[];
}

export interface ILeetCodeClient {
  /**
   * Verifies whether a given user has an accepted submission for a problem.
   *
   * @param leetcodeUsername - The LeetCode username to check.
   * @param problemSlug      - The problem's URL slug (e.g., "two-sum").
   * @returns                  True if an "Accepted" submission exists.
   */
  verifyUserSubmission(
    leetcodeUsername: string,
    problemSlug: string,
  ): Promise<boolean>;

  /**
   * Fetches metadata for a LeetCode problem by its slug.
   *
   * @param problemSlug - The problem's URL slug (e.g., "two-sum").
   * @returns             Problem title, difficulty, and topic tags.
   */
  fetchProblemMetadata(problemSlug: string): Promise<LeetCodeProblemMetadata>;

  /**
   * Fetches a user's recent accepted submissions from LeetCode.
   * Returns raw submission data including timestamps for filtering.
   *
   * @param leetcodeUsername - The LeetCode username to query.
   * @param limit            - Maximum number of submissions to fetch (default: 50).
   * @returns                  Array of accepted submissions with timestamps.
   */
  fetchRecentAcceptedSubmissions(
    leetcodeUsername: string,
    limit?: number,
  ): Promise<LeetCodeSubmission[]>;
}
