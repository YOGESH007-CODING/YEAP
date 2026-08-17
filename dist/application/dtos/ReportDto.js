"use strict";
/**
 * src/application/dtos/ReportDto.ts
 *
 * Zod validation schemas for the POST /api/review/report endpoint.
 * The self-report flow: user searches by slug, selects a problem,
 * and submits a quality score — all in one request, zero API calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportSchema = void 0;
const zod_1 = require("zod");
const MemoryLayerService_1 = require("../use-cases/MemoryLayerService");
// ─── Request Schema ───────────────────────────────────────────────────────────
exports.ReportSchema = zod_1.z.object({
    problemSlug: zod_1.z
        .string()
        .min(1, 'problemSlug must not be empty')
        .describe('The LeetCode problem slug (e.g., "two-sum")'),
    qualityScore: zod_1.z
        .number()
        .int('qualityScore must be an integer')
        .min(0, 'qualityScore must be at least 0')
        .max(5, 'qualityScore must be at most 5')
        .describe('SM-2 quality score: 0 (complete blackout) to 5 (perfect recall)'),
    mistake: zod_1.z.object({ type: zod_1.z.enum(MemoryLayerService_1.MISTAKE_TYPES), description: zod_1.z.string().trim().max(500).optional() }).optional(),
});
//# sourceMappingURL=ReportDto.js.map