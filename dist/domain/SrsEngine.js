"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SrsEngine = exports.EF_DEFAULT = void 0;
// ─── Constants ───────────────────────────────────────────────────────────────
/** EF is never allowed to drop below this floor per SM-2 specification. */
const EF_FLOOR = 1.3;
/** Default starting EF for all new problems per SM-2 specification. */
exports.EF_DEFAULT = 2.5;
/** Target morning review hour in UTC (4:00 AM). */
const MORNING_HOUR_UTC = 4;
// ─── SrsEngine Class ─────────────────────────────────────────────────────────
/**
 * SrsEngine — stateless utility class wrapping the SM-2 algorithm.
 *
 * All methods are static to enforce that this class is purely functional
 * and carries no state between calls.
 */
class SrsEngine {
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
    static calculateNextReview(state, quality) {
        SrsEngine.validateQuality(quality);
        // ── Step 1: Update Easiness Factor ────────────────────────────────────
        // Formula: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        const efDelta = 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
        const rawEF = state.easinessFactor + efDelta;
        const newEF = Math.max(EF_FLOOR, rawEF);
        // ── Step 2: Update Repetitions and Interval ───────────────────────────
        let newRepetitions;
        let newInterval;
        if (quality < 3) {
            // Incorrect response: reset to beginning of SM-2 schedule
            newRepetitions = 0;
            newInterval = 1;
        }
        else {
            // Correct response: advance the schedule
            newRepetitions = state.repetitions + 1;
            if (newRepetitions === 1) {
                newInterval = 1;
            }
            else if (newRepetitions === 2) {
                newInterval = 6;
            }
            else {
                // I(n) = round(I(n-1) * EF)
                newInterval = Math.round(state.intervalDays * newEF);
            }
        }
        // ── Step 3: Compute Next Due Date at 4:00 AM UTC ─────────────────────
        const nextDueDate = SrsEngine.computeMorningDueDate(newInterval);
        return {
            repetitions: newRepetitions,
            easinessFactor: newEF,
            intervalDays: newInterval,
            nextDueDate,
        };
    }
    /**
     * Normalizes a future date by adding `intervalDays` to today and setting
     * the time to exactly 4:00 AM UTC — the standard morning runtime window.
     *
     * This prevents due dates from drifting across timezones or review times.
     *
     * @param intervalDays - Number of days until the next review.
     * @returns Date set to 4:00 AM UTC, `intervalDays` from now.
     */
    static computeMorningDueDate(intervalDays) {
        const now = new Date();
        const due = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + intervalDays, MORNING_HOUR_UTC, // 4:00 AM UTC
        0, 0, 0));
        return due;
    }
    /**
     * Creates the default initial SRS state for a problem being tracked for
     * the first time (before any review has occurred).
     */
    static initialState() {
        return {
            repetitions: 0,
            easinessFactor: exports.EF_DEFAULT,
            intervalDays: 1,
        };
    }
    // ── Private Guards ─────────────────────────────────────────────────────────
    static validateQuality(quality) {
        if (!Number.isInteger(quality) || quality < 0 || quality > 5) {
            throw new RangeError(`Quality score must be an integer in [0, 5]. Received: ${quality}`);
        }
    }
}
exports.SrsEngine = SrsEngine;
//# sourceMappingURL=SrsEngine.js.map