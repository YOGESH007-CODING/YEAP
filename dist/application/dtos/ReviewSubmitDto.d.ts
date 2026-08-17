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
    mistake: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["LOGIC_ERROR", "EDGE_CASE", "WRONG_APPROACH", "TIME_COMPLEXITY", "MISREAD_PROBLEM", "FORGOT_PATTERN", "SYNTAX_SLIP"]>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    }, {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    problemId: string;
    qualityScore: number;
    mistake?: {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    } | undefined;
}, {
    problemId: string;
    qualityScore: number;
    mistake?: {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    } | undefined;
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