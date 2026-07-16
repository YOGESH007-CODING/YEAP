"use strict";
/**
 * src/application/dtos/ReviewSubmitDto.ts
 *
 * Zod validation schemas for the POST /api/review/submit endpoint.
 * These schemas act as the boundary guard — no invalid data crosses into use cases.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewTrackSchema = exports.ReviewSubmitSchema = void 0;
const zod_1 = require("zod");
// ─── Request Schema ───────────────────────────────────────────────────────────
exports.ReviewSubmitSchema = zod_1.z.object({
    problemId: zod_1.z
        .string()
        .min(1, 'problemId must not be empty')
        .describe('The internal database ID of the problem being reviewed'),
    qualityScore: zod_1.z
        .number()
        .int('qualityScore must be an integer')
        .min(0, 'qualityScore must be at least 0')
        .max(5, 'qualityScore must be at most 5')
        .describe('SM-2 quality score: 0 (complete blackout) to 5 (perfect recall)'),
});
exports.ReviewTrackSchema = zod_1.z.object({
    problemId: zod_1.z
        .string()
        .min(1, 'problemId must not be empty')
        .describe('The internal database ID of the problem to track'),
});
//# sourceMappingURL=ReviewSubmitDto.js.map