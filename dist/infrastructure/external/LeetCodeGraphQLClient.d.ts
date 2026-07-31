/**
 * src/infrastructure/external/LeetCodeGraphQLClient.ts
 *
 * Concrete implementation of ILeetCodeClient using the public LeetCode GraphQL API.
 * All requests target: https://leetcode.com/graphql
 *
 * Guardrail: All network calls are wrapped in try/catch. Failures throw
 * descriptive errors that callers can handle without crashing the worker loop.
 */
import type { ILeetCodeClient, LeetCodeProblemMetadata } from '../../domain/interfaces/ILeetCodeClient';
export declare class LeetCodeGraphQLClient implements ILeetCodeClient {
    private readonly endpoint;
    constructor(endpoint?: string);
    /**
     * Verifies that a user has an accepted submission for a given problem.
     * Checks up to the 20 most recent accepted submissions.
     */
    verifyUserSubmission(leetcodeUsername: string, problemSlug: string): Promise<boolean>;
    /**
     * Fetches problem metadata (title, difficulty, tags) by slug.
     */
    fetchProblemMetadata(problemSlug: string): Promise<LeetCodeProblemMetadata>;
    /**
     * Fetches a user's recent accepted submissions from LeetCode.
     * Returns raw submission data with timestamps for sync filtering.
     */
    fetchRecentAcceptedSubmissions(leetcodeUsername: string, limit?: number): Promise<import('../../domain/interfaces/ILeetCodeClient').LeetCodeSubmission[]>;
    private requestChain;
    private lastRequestTime;
    private executeQuery;
    private normalizeDifficulty;
}
//# sourceMappingURL=LeetCodeGraphQLClient.d.ts.map