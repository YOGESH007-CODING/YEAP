/**
 * src/application/dtos/AuthDto.ts
 *
 * Zod validation schemas for all auth endpoints.
 */
import { z } from 'zod';
export declare const RegisterDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
}>;
export declare const LoginDto: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const RefreshDto: z.ZodObject<{
    refreshToken: z.ZodString;
}, "strip", z.ZodTypeAny, {
    refreshToken: string;
}, {
    refreshToken: string;
}>;
export declare const UpdateProfileDto: z.ZodObject<{
    leetcodeUsername: z.ZodString;
}, "strip", z.ZodTypeAny, {
    leetcodeUsername: string;
}, {
    leetcodeUsername: string;
}>;
export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type RefreshInput = z.infer<typeof RefreshDto>;
//# sourceMappingURL=AuthDto.d.ts.map