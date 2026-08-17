/**
 * src/application/dtos/ReviewSubmitDto.ts
 *
 * Zod validation schemas for the POST /api/review/submit endpoint.
 * These schemas act as the boundary guard — no invalid data crosses into use cases.
 */

import { z } from 'zod';
import { MISTAKE_TYPES } from '../use-cases/MemoryLayerService';

// ─── Request Schema ───────────────────────────────────────────────────────────

export const ReviewSubmitSchema = z.object({
  problemId: z
    .string()
    .min(1, 'problemId must not be empty')
    .describe('The internal database ID of the problem being reviewed'),

  qualityScore: z
    .number()
    .int('qualityScore must be an integer')
    .min(0, 'qualityScore must be at least 0')
    .max(5, 'qualityScore must be at most 5')
    .describe('SM-2 quality score: 0 (complete blackout) to 5 (perfect recall)'),
  mistake: z.object({ type: z.enum(MISTAKE_TYPES), description: z.string().trim().max(500).optional() }).optional(),
});

export const ReviewTrackSchema = z.object({
  problemId: z
    .string()
    .min(1, 'problemId must not be empty')
    .describe('The internal database ID of the problem to track'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReviewSubmitDto = z.infer<typeof ReviewSubmitSchema>;
export type ReviewTrackDto = z.infer<typeof ReviewTrackSchema>;

// ─── Response DTO ─────────────────────────────────────────────────────────────

export interface ReviewSubmitResponseDto {
  success: boolean;
  message: string;
  data: {
    problemId: string;
    problemTitle: string;
    newInterval: number;
    newEasinessFactor: number;
    nextDueDate: string; // ISO 8601 string
    repetitions: number;
    qualityScore: number;
  };
}
