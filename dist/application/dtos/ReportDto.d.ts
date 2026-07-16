/**
 * src/application/dtos/ReportDto.ts
 *
 * Zod validation schemas for the POST /api/review/report endpoint.
 * The self-report flow: user searches by slug, selects a problem,
 * and submits a quality score — all in one request, zero API calls.
 */
import { z } from 'zod';
export declare const ReportSchema: z.ZodObject<{
    problemSlug: z.ZodString;
    qualityScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    qualityScore: number;
    problemSlug: string;
}, {
    qualityScore: number;
    problemSlug: string;
}>;
export type ReportDto = z.infer<typeof ReportSchema>;
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
        nextDueDate: string;
        repetitions: number;
        qualityScore: number;
    };
}
//# sourceMappingURL=ReportDto.d.ts.map