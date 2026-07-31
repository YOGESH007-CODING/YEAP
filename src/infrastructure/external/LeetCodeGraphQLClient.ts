/**
 * src/infrastructure/external/LeetCodeGraphQLClient.ts
 *
 * Concrete implementation of ILeetCodeClient using the public LeetCode GraphQL API.
 * All requests target: https://leetcode.com/graphql
 *
 * Guardrail: All network calls are wrapped in try/catch. Failures throw
 * descriptive errors that callers can handle without crashing the worker loop.
 */

import type {
  ILeetCodeClient,
  LeetCodeProblemMetadata,
} from '../../domain/interfaces/ILeetCodeClient';
import { logger } from '../../shared/utils/logger';

// ─── GraphQL Query Definitions ────────────────────────────────────────────────

const RECENT_SUBMISSIONS_QUERY = `
  query recentAcSubmissions($username: String!, $limit: Int!) {
    recentAcSubmissionList(username: $username, limit: $limit) {
      titleSlug
      statusDisplay
      timestamp
      lang
    }
  }
`;

const PROBLEM_METADATA_QUERY = `
  query problemMetadata($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      title
      titleSlug
      difficulty
      topicTags {
        name
      }
    }
  }
`;

// ─── Response Types ───────────────────────────────────────────────────────────

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface RecentSubmissionsData {
  recentAcSubmissionList: Array<{
    titleSlug: string;
    statusDisplay: string;
    timestamp: string;
    lang: string;
  }>;
}

interface ProblemMetadataData {
  question: {
    title: string;
    titleSlug: string;
    difficulty: string;
    topicTags: Array<{ name: string }>;
  } | null;
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class LeetCodeGraphQLClient implements ILeetCodeClient {
  private readonly endpoint: string;

  constructor(
    endpoint: string = process.env['LEETCODE_GRAPHQL_URL'] ?? 'https://leetcode.com/graphql',
  ) {
    this.endpoint = endpoint;
  }

  /**
   * Verifies that a user has an accepted submission for a given problem.
   * Checks up to the 20 most recent accepted submissions.
   */
  async verifyUserSubmission(
    leetcodeUsername: string,
    problemSlug: string,
  ): Promise<boolean> {
    try {
      logger.debug(
        `[LeetCodeClient] Verifying submission for user="${leetcodeUsername}", slug="${problemSlug}"`,
      );

      const response = await this.executeQuery<RecentSubmissionsData>(
        RECENT_SUBMISSIONS_QUERY,
        { username: leetcodeUsername, limit: 20 },
      );

      const submissions = response.data?.recentAcSubmissionList ?? [];
      const found = submissions.some(
        (s) =>
          s.titleSlug === problemSlug &&
          s.statusDisplay === 'Accepted',
      );

      logger.debug(
        `[LeetCodeClient] Submission verification result: ${found ? 'FOUND' : 'NOT FOUND'}`,
      );

      return found;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[LeetCodeClient] verifyUserSubmission failed: ${message}`);
      // Propagate a clean error — don't crash the caller
      throw new Error(`LeetCode API verification failed: ${message}`);
    }
  }

  /**
   * Fetches problem metadata (title, difficulty, tags) by slug.
   */
  async fetchProblemMetadata(problemSlug: string): Promise<LeetCodeProblemMetadata> {
    try {
      logger.debug(`[LeetCodeClient] Fetching metadata for slug="${problemSlug}"`);

      const response = await this.executeQuery<ProblemMetadataData>(
        PROBLEM_METADATA_QUERY,
        { titleSlug: problemSlug },
      );

      const question = response.data?.question;
      if (!question) {
        throw new Error(`Problem not found on LeetCode: ${problemSlug}`);
      }

      const difficulty = this.normalizeDifficulty(question.difficulty);

      return {
        slug: question.titleSlug,
        title: question.title,
        difficulty,
        tags: question.topicTags.map((t) => t.name),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[LeetCodeClient] fetchProblemMetadata failed: ${message}`);
      throw new Error(`LeetCode metadata fetch failed: ${message}`);
    }
  }

  /**
   * Fetches a user's recent accepted submissions from LeetCode.
   * Returns raw submission data with timestamps for sync filtering.
   */
  async fetchRecentAcceptedSubmissions(
    leetcodeUsername: string,
    limit = 50,
  ): Promise<import('../../domain/interfaces/ILeetCodeClient').LeetCodeSubmission[]> {
    try {
      logger.debug(
        `[LeetCodeClient] Fetching recent AC submissions for user="${leetcodeUsername}", limit=${limit}`,
      );

      const response = await this.executeQuery<RecentSubmissionsData>(
        RECENT_SUBMISSIONS_QUERY,
        { username: leetcodeUsername, limit },
      );

      const submissions = response.data?.recentAcSubmissionList ?? [];

      logger.debug(
        `[LeetCodeClient] Fetched ${submissions.length} recent AC submissions for user="${leetcodeUsername}"`,
      );

      return submissions.map((s) => ({
        titleSlug: s.titleSlug,
        statusDisplay: s.statusDisplay,
        timestamp: s.timestamp,
        lang: s.lang,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[LeetCodeClient] fetchRecentAcceptedSubmissions failed: ${message}`);
      throw new Error(`LeetCode API fetch submissions failed: ${message}`);
    }
  }

  private requestChain: Promise<void> = Promise.resolve();
  private lastRequestTime = 0;

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async executeQuery<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GraphQLResponse<T>> {
    return new Promise((resolve, reject) => {
      this.requestChain = this.requestChain.then(async () => {
        try {
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < 2000) {
            const delay = 2000 - elapsed;
            logger.debug(`[LeetCodeClient] Throttling request by ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
          }
          this.lastRequestTime = Date.now();

          const response = await fetch(this.endpoint, {
            method: 'POST',
            signal: AbortSignal.timeout(15_000), // 15s timeout — LeetCode API can be slow
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'YEAP-SRS/1.0',
              Referer: 'https://leetcode.com',
            },
            body: JSON.stringify({ query, variables }),
          });

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status} from LeetCode GraphQL: ${response.statusText}`,
            );
          }

          const json = (await response.json()) as GraphQLResponse<T>;

          if (json.errors?.length) {
            throw new Error(
              `GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`,
            );
          }

          resolve(json);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private normalizeDifficulty(
    raw: string,
  ): 'Easy' | 'Medium' | 'Hard' {
    const map: Record<string, 'Easy' | 'Medium' | 'Hard'> = {
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
    };
    return map[raw.toLowerCase()] ?? 'Medium';
  }
}
