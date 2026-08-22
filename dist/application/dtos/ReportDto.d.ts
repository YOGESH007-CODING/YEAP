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
    qualityScore: number;
    problemSlug: string;
    mistake?: {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    } | undefined;
}, {
    qualityScore: number;
    problemSlug: string;
    mistake?: {
        type: "LOGIC_ERROR" | "EDGE_CASE" | "WRONG_APPROACH" | "TIME_COMPLEXITY" | "MISREAD_PROBLEM" | "FORGOT_PATTERN" | "SYNTAX_SLIP";
        description?: string | undefined;
    } | undefined;
}>;
export type ReportDto = z.infer<typeof ReportSchema>;
export interface ReportResponseDto {
    success: boolean;
    message: string;
    data: {
        problemId: string;
        problemSlug: string;
        problemTitle: string;
        topicTags: string[];
        difficulty: string;
        newInterval: number;
        newEasinessFactor: number;
        nextDueDate: string;
        repetitions: number;
        qualityScore: number;
    };
}
//# sourceMappingURL=ReportDto.d.ts.map