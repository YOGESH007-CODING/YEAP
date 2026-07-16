/**
 * src/domain/SrsEngine.ts
 *
 * Pure SM-2 Spaced Repetition Mathematical Engine.
 *
 * ISOLATION RULE: This file must NEVER import from src/infrastructure/ or
 * any database/framework libraries. It operates exclusively on plain DTOs.
 *
 * SM-2 Algorithm Reference:
 *   https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * Formulas:
 *   EF(new) = EF(old) + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 *   EF_floor = 1.3
 *   I(1) = 1 day
 *   I(2) = 6 days
 *   I(n) = round(I(n-1) * EF)   for n > 2
 */
/** The current SM-2 state for a problem, fetched from the database. */
export interface SrsState {
    /** Number of times this item has been successfully reviewed (q >= 3). */
    repetitions: number;
    /** The Easiness Factor — controls how quickly interval grows. Min: 1.3 */
    easinessFactor: number;
    /** Current interval in days before review becomes due again. */
    intervalDays: number;
}
/** The result of computing the next review schedule. */
export interface SrsResult {
    /** Updated repetition count. */
    repetitions: number;
    /** Updated Easiness Factor (floored at 1.3). */
    easinessFactor: number;
    /** Updated interval in days. */
    intervalDays: number;
    /** The computed next review date, normalized to 4:00 AM UTC. */
    nextDueDate: Date;
}
/** Default starting EF for all new problems per SM-2 specification. */
export declare const EF_DEFAULT = 2.5;
/**
 * SrsEngine — stateless utility class wrapping the SM-2 algorithm.
 *
 * All methods are static to enforce that this class is purely functional
 * and carries no state between calls.
 */
export declare class SrsEngine {
    /**
     * Compute the next review schedule for a problem given its current SM-2
     * state and the user's quality score for the current session.
     *
     * @param state   - Current SM-2 state (repetitions, EF, interval).
     * @param quality - User's quality score: integer in range [0, 5].
     *                  0–2: Incorrect/too hard → reset repetitions.
     *                  3–5: Correct → advance the interval.
     * @returns       Updated SRS state and the next due date.
     */
    static calculateNextReview(state: SrsState, quality: number): SrsResult;
    /**
     * Normalizes a future date by adding `intervalDays` to today and setting
     * the time to exactly 4:00 AM UTC — the standard morning runtime window.
     *
     * This prevents due dates from drifting across timezones or review times.
     *
     * @param intervalDays - Number of days until the next review.
     * @returns Date set to 4:00 AM UTC, `intervalDays` from now.
     */
    static computeMorningDueDate(intervalDays: number): Date;
    /**
     * Creates the default initial SRS state for a problem being tracked for
     * the first time (before any review has occurred).
     */
    static initialState(): SrsState;
    private static validateQuality;
}
//# sourceMappingURL=SrsEngine.d.ts.map