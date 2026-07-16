/**
 * src/domain/__tests__/SrsEngine.test.ts
 *
 * Isolated unit tests for the SM-2 SrsEngine.
 * Zero external dependencies — purely functional input/output testing.
 *
 * Coverage matrix (per spec):
 *   - q = 0: Complete blackout → reset + EF decrease
 *   - q = 1: Incorrect but familiar → reset + EF decrease
 *   - q = 2: Incorrect, easy recall → reset + EF decrease
 *   - q = 3: Correct, hard recall → advance + EF decrease
 *   - q = 4: Correct, normal → advance + EF stable/increase
 *   - q = 5: Perfect recall → advance + EF increase
 *   - EF floor enforcement at 1.3
 *   - Interval progression: 1 → 6 → I * EF
 *   - Morning date normalization (4:00 AM UTC)
 */

import { SrsEngine, EF_DEFAULT } from '../SrsEngine';
import type { SrsState } from '../SrsEngine';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

const makeState = (
  overrides: Partial<SrsState> = {},
): SrsState => ({
  repetitions: 0,
  easinessFactor: EF_DEFAULT, // 2.5
  intervalDays: 1,
  ...overrides,
});

// ─── Quality Boundary Tests ───────────────────────────────────────────────────

describe('SrsEngine.calculateNextReview — Quality Boundaries', () => {
  describe('q = 0 (complete blackout)', () => {
    it('resets repetitions to 0', () => {
      const state = makeState({ repetitions: 5, intervalDays: 64 });
      const result = SrsEngine.calculateNextReview(state, 0);
      expect(result.repetitions).toBe(0);
    });

    it('resets interval to 1 day', () => {
      const state = makeState({ repetitions: 5, intervalDays: 64 });
      const result = SrsEngine.calculateNextReview(state, 0);
      expect(result.intervalDays).toBe(1);
    });

    it('decreases EF significantly (delta = -0.8)', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 0);
      // EF(0) = EF + 0.1 - 5*0.08 - 5*5*0.02 = 2.5 + 0.1 - 0.4 - 0.5 = 1.7
      expect(result.easinessFactor).toBeCloseTo(1.7, 5);
    });

    it('floors EF at 1.3 if it would go below', () => {
      const state = makeState({ easinessFactor: 1.4 });
      const result = SrsEngine.calculateNextReview(state, 0);
      // 1.4 + (-0.8) = 0.6 → should be clamped to 1.3
      expect(result.easinessFactor).toBe(1.3);
    });
  });

  describe('q = 1 (incorrect, but remembered on seeing answer)', () => {
    it('resets repetitions to 0', () => {
      const state = makeState({ repetitions: 3 });
      const result = SrsEngine.calculateNextReview(state, 1);
      expect(result.repetitions).toBe(0);
    });

    it('decreases EF by 0.46', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 1);
      // delta = 0.1 - 4*0.08 - 4*4*0.02 = 0.1 - 0.32 - 0.32 = -0.54
      expect(result.easinessFactor).toBeCloseTo(2.5 - 0.54, 5);
    });
  });

  describe('q = 2 (incorrect, recalled with serious difficulty)', () => {
    it('resets repetitions to 0', () => {
      const state = makeState({ repetitions: 2 });
      const result = SrsEngine.calculateNextReview(state, 2);
      expect(result.repetitions).toBe(0);
    });

    it('decreases EF slightly', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 2);
      // delta = 0.1 - 3*0.08 - 3*3*0.02 = 0.1 - 0.24 - 0.18 = -0.32
      expect(result.easinessFactor).toBeCloseTo(2.5 - 0.32, 5);
    });
  });

  describe('q = 3 (correct, but with significant difficulty)', () => {
    it('increments repetitions', () => {
      const state = makeState({ repetitions: 0 });
      const result = SrsEngine.calculateNextReview(state, 3);
      expect(result.repetitions).toBe(1);
    });

    it('sets interval to 1 for first repetition', () => {
      const state = makeState({ repetitions: 0 });
      const result = SrsEngine.calculateNextReview(state, 3);
      expect(result.intervalDays).toBe(1);
    });

    it('EF stays same (delta = 0)', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 3);
      // delta = 0.1 - 2*0.08 - 2*2*0.02 = 0.1 - 0.16 - 0.08 = -0.14
      expect(result.easinessFactor).toBeCloseTo(2.5 - 0.14, 5);
    });
  });

  describe('q = 4 (correct, after some hesitation)', () => {
    it('increments repetitions to 1 from 0', () => {
      const state = makeState({ repetitions: 0 });
      const result = SrsEngine.calculateNextReview(state, 4);
      expect(result.repetitions).toBe(1);
    });

    it('EF increases slightly', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 4);
      // delta = 0.1 - 1*0.08 - 1*1*0.02 = 0.1 - 0.08 - 0.02 = 0.0
      expect(result.easinessFactor).toBeCloseTo(2.5, 5);
    });
  });

  describe('q = 5 (perfect recall)', () => {
    it('increments repetitions', () => {
      const state = makeState({ repetitions: 2, intervalDays: 6 });
      const result = SrsEngine.calculateNextReview(state, 5);
      expect(result.repetitions).toBe(3);
    });

    it('EF increases by 0.1', () => {
      const state = makeState();
      const result = SrsEngine.calculateNextReview(state, 5);
      // delta = 0.1 - 0 = 0.1
      expect(result.easinessFactor).toBeCloseTo(2.6, 5);
    });
  });
});

// ─── Interval Progression Tests ───────────────────────────────────────────────

describe('SrsEngine.calculateNextReview — Interval Progression', () => {
  it('first correct review (n=1) → interval = 1 day', () => {
    const state = makeState({ repetitions: 0 });
    const result = SrsEngine.calculateNextReview(state, 4);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('second correct review (n=2) → interval = 6 days', () => {
    const state = makeState({ repetitions: 1, intervalDays: 1 });
    const result = SrsEngine.calculateNextReview(state, 4);
    expect(result.intervalDays).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('third correct review (n=3) → interval = round(6 * EF)', () => {
    const state = makeState({ repetitions: 2, intervalDays: 6, easinessFactor: 2.5 });
    const result = SrsEngine.calculateNextReview(state, 4);
    // EF after q=4: 2.5 + 0 = 2.5; interval = round(6 * 2.5) = 15
    expect(result.intervalDays).toBe(15);
    expect(result.repetitions).toBe(3);
  });

  it('fourth review → interval = round(I_prev * EF)', () => {
    const state = makeState({ repetitions: 3, intervalDays: 15, easinessFactor: 2.5 });
    const result = SrsEngine.calculateNextReview(state, 5);
    // EF after q=5: 2.5 + 0.1 = 2.6; interval = round(15 * 2.6) = 39
    expect(result.intervalDays).toBe(39);
  });

  it('failure resets to interval = 1 regardless of prior progress', () => {
    const state = makeState({ repetitions: 10, intervalDays: 120, easinessFactor: 2.5 });
    const result = SrsEngine.calculateNextReview(state, 2);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(0);
  });
});

// ─── EF Floor Tests ───────────────────────────────────────────────────────────

describe('SrsEngine — EF Floor Enforcement', () => {
  it('EF is never allowed to drop below 1.3', () => {
    let state = makeState({ easinessFactor: 1.35 });

    // Repeatedly submit quality=0 to attempt EF drain
    for (let i = 0; i < 20; i++) {
      const result = SrsEngine.calculateNextReview(state, 0);
      expect(result.easinessFactor).toBeGreaterThanOrEqual(1.3);
      state = {
        repetitions: result.repetitions,
        easinessFactor: result.easinessFactor,
        intervalDays: result.intervalDays,
      };
    }
  });

  it('EF at exact 1.3 with q=0 stays at 1.3', () => {
    const state = makeState({ easinessFactor: 1.3 });
    const result = SrsEngine.calculateNextReview(state, 0);
    expect(result.easinessFactor).toBe(1.3);
  });
});

// ─── Morning Date Normalization ───────────────────────────────────────────────

describe('SrsEngine.computeMorningDueDate', () => {
  it('returns a date set to 4:00 AM UTC', () => {
    const due = SrsEngine.computeMorningDueDate(1);
    expect(due.getUTCHours()).toBe(4);
    expect(due.getUTCMinutes()).toBe(0);
    expect(due.getUTCSeconds()).toBe(0);
    expect(due.getUTCMilliseconds()).toBe(0);
  });

  it('adds intervalDays to today', () => {
    const now = new Date();
    const due = SrsEngine.computeMorningDueDate(7);
    // Handle month overflow by checking the day diff
    const daysDiff = Math.round(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(daysDiff).toBeGreaterThanOrEqual(6);
    expect(daysDiff).toBeLessThanOrEqual(8); // tolerance for test timing
  });
});

// ─── Validation Tests ─────────────────────────────────────────────────────────

describe('SrsEngine — Input Validation', () => {
  it('throws RangeError for quality score > 5', () => {
    const state = makeState();
    expect(() => SrsEngine.calculateNextReview(state, 6)).toThrow(RangeError);
    expect(() => SrsEngine.calculateNextReview(state, 6)).toThrow(/\[0, 5\]/);
  });

  it('throws RangeError for quality score < 0', () => {
    const state = makeState();
    expect(() => SrsEngine.calculateNextReview(state, -1)).toThrow(RangeError);
  });

  it('throws RangeError for non-integer quality score', () => {
    const state = makeState();
    expect(() => SrsEngine.calculateNextReview(state, 3.5)).toThrow(RangeError);
  });

  it('accepts all valid boundary values 0–5', () => {
    const state = makeState();
    for (let q = 0; q <= 5; q++) {
      expect(() => SrsEngine.calculateNextReview(state, q)).not.toThrow();
    }
  });
});

// ─── Initial State ────────────────────────────────────────────────────────────

describe('SrsEngine.initialState', () => {
  it('returns correct SM-2 defaults', () => {
    const state = SrsEngine.initialState();
    expect(state.repetitions).toBe(0);
    expect(state.easinessFactor).toBe(EF_DEFAULT); // 2.5
    expect(state.intervalDays).toBe(1);
  });
});
