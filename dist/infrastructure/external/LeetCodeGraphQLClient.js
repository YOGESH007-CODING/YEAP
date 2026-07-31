"use strict";
/**
 * src/infrastructure/external/LeetCodeGraphQLClient.ts
 *
 * Concrete implementation of ILeetCodeClient using the public LeetCode GraphQL API.
 * All requests target: https://leetcode.com/graphql
 *
 * Guardrail: All network calls are wrapped in try/catch. Failures throw
 * descriptive errors that callers can handle without crashing the worker loop.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeetCodeGraphQLClient = void 0;
const logger_1 = require("../../shared/utils/logger");
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
// ─── Client ───────────────────────────────────────────────────────────────────
class LeetCodeGraphQLClient {
    constructor(endpoint = process.env['LEETCODE_GRAPHQL_URL'] ?? 'https://leetcode.com/graphql') {
        this.requestChain = Promise.resolve();
        this.lastRequestTime = 0;
        this.endpoint = endpoint;
    }
    /**
     * Verifies that a user has an accepted submission for a given problem.
     * Checks up to the 20 most recent accepted submissions.
     */
    async verifyUserSubmission(leetcodeUsername, problemSlug) {
        try {
            logger_1.logger.debug(`[LeetCodeClient] Verifying submission for user="${leetcodeUsername}", slug="${problemSlug}"`);
            const response = await this.executeQuery(RECENT_SUBMISSIONS_QUERY, { username: leetcodeUsername, limit: 20 });
            const submissions = response.data?.recentAcSubmissionList ?? [];
            const found = submissions.some((s) => s.titleSlug === problemSlug &&
                s.statusDisplay === 'Accepted');
            logger_1.logger.debug(`[LeetCodeClient] Submission verification result: ${found ? 'FOUND' : 'NOT FOUND'}`);
            return found;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[LeetCodeClient] verifyUserSubmission failed: ${message}`);
            // Propagate a clean error — don't crash the caller
            throw new Error(`LeetCode API verification failed: ${message}`);
        }
    }
    /**
     * Fetches problem metadata (title, difficulty, tags) by slug.
     */
    async fetchProblemMetadata(problemSlug) {
        try {
            logger_1.logger.debug(`[LeetCodeClient] Fetching metadata for slug="${problemSlug}"`);
            const response = await this.executeQuery(PROBLEM_METADATA_QUERY, { titleSlug: problemSlug });
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
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[LeetCodeClient] fetchProblemMetadata failed: ${message}`);
            throw new Error(`LeetCode metadata fetch failed: ${message}`);
        }
    }
    /**
     * Fetches a user's recent accepted submissions from LeetCode.
     * Returns raw submission data with timestamps for sync filtering.
     */
    async fetchRecentAcceptedSubmissions(leetcodeUsername, limit = 50) {
        try {
            logger_1.logger.debug(`[LeetCodeClient] Fetching recent AC submissions for user="${leetcodeUsername}", limit=${limit}`);
            const response = await this.executeQuery(RECENT_SUBMISSIONS_QUERY, { username: leetcodeUsername, limit });
            const submissions = response.data?.recentAcSubmissionList ?? [];
            logger_1.logger.debug(`[LeetCodeClient] Fetched ${submissions.length} recent AC submissions for user="${leetcodeUsername}"`);
            return submissions.map((s) => ({
                titleSlug: s.titleSlug,
                statusDisplay: s.statusDisplay,
                timestamp: s.timestamp,
                lang: s.lang,
            }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`[LeetCodeClient] fetchRecentAcceptedSubmissions failed: ${message}`);
            throw new Error(`LeetCode API fetch submissions failed: ${message}`);
        }
    }
    // ─── Private Helpers ─────────────────────────────────────────────────────────
    async executeQuery(query, variables) {
        return new Promise((resolve, reject) => {
            this.requestChain = this.requestChain.then(async () => {
                try {
                    const now = Date.now();
                    const elapsed = now - this.lastRequestTime;
                    if (elapsed < 2000) {
                        const delay = 2000 - elapsed;
                        logger_1.logger.debug(`[LeetCodeClient] Throttling request by ${delay}ms...`);
                        await new Promise((r) => setTimeout(r, delay));
                    }
                    this.lastRequestTime = Date.now();
                    const response = await fetch(this.endpoint, {
                        method: 'POST',
                        signal: AbortSignal.timeout(15000), // 15s timeout — LeetCode API can be slow
                        headers: {
                            'Content-Type': 'application/json',
                            'User-Agent': 'YEAP-SRS/1.0',
                            Referer: 'https://leetcode.com',
                        },
                        body: JSON.stringify({ query, variables }),
                    });
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} from LeetCode GraphQL: ${response.statusText}`);
                    }
                    const json = (await response.json());
                    if (json.errors?.length) {
                        throw new Error(`GraphQL error: ${json.errors.map((e) => e.message).join(', ')}`);
                    }
                    resolve(json);
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    }
    normalizeDifficulty(raw) {
        const map = {
            easy: 'Easy',
            medium: 'Medium',
            hard: 'Hard',
        };
        return map[raw.toLowerCase()] ?? 'Medium';
    }
}
exports.LeetCodeGraphQLClient = LeetCodeGraphQLClient;
//# sourceMappingURL=LeetCodeGraphQLClient.js.map