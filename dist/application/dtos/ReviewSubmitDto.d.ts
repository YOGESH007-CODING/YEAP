/**
 * src/application/dtos/ReviewSubmitDto.ts
 *
 * Zod validation schemas for the POST /api/review/submit endpoint.
 * These schemas act as the boundary guard — no invalid data crosses into use cases.
 */
import { z } from 'zod';
export declare const ReviewSubmitSchema: z.ZodObject<{
    problemId: z.ZodString;
    qualityScore: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    problemId: string;
    qualityScore: number;
}, {
    problemId: string;
    qualityScore: number;
}>;
export declare const ReviewTrackSchema: z.ZodObject<{
    problemId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    problemId: string;
}, {
    problemId: string;
}>;
export type ReviewSubmitDto = z.infer<typeof ReviewSubmitSchema>;
export type ReviewTrackDto = z.infer<typeof ReviewTrackSchema>;
export interface ReviewSubmitResponseDto {
    success: boolean;
    message: string;
    data: {
        problemId: string;
        problemTitle: string;
        newInterval: number;
        newEasinessFactor: number;
        nextDueDate: string;
        repetitions: number;
        qualityScore: number;
    };
}
//# sourceMappingURL=ReviewSubmitDto.d.ts.map