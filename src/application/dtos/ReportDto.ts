/**
 * src/application/dtos/ReportDto.ts
 *
 * Zod validation schemas for the POST /api/review/report endpoint.
 * The self-report flow: user searches by slug, selects a problem,
 * and submits a quality score — all in one request, zero API calls.
 */

import { z } from 'zod';
import { MISTAKE_TYPES } from '../use-cases/MemoryLayerService';

// ─── Request Schema ───────────────────────────────────────────────────────────

export const ReportSchema = z.object({
  problemSlug: z
    .string()
    .min(1, 'problemSlug must not be empty')
    .describe('The LeetCode problem slug (e.g., "two-sum")'),

  qualityScore: z
    .number()
    .int('qualityScore must be an integer')
    .min(0, 'qualityScore must be at least 0')
    .max(5, 'qualityScore must be at most 5')
    .describe('SM-2 quality score: 0 (complete blackout) to 5 (perfect recall)'),
  mistake: z.object({ type: z.enum(MISTAKE_TYPES), description: z.string().trim().max(500).optional() }).optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportDto = z.infer<typeof ReportSchema>;

// ─── Response DTO ─────────────────────────────────────────────────────────────

export interface ReportResponseDto {
  success: boolean;
  message: string;
  data: {
    problemId: string;
    problemSlug: string;
    problemTitle: string;
    difficulty: string;
    newInterval: number;
    newEasinessFactor: number;
    nextDueDate: string; // ISO 8601
    repetitions: number;
    qualityScore: number;
  };
}
