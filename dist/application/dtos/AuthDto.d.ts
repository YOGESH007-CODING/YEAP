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
    leetcodeUsername: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    leetcodeUsername: string;
    password: string;
    name?: string | undefined;
}, {
    email: string;
    leetcodeUsername: string;
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
export declare const VerifyEmailDto: z.ZodObject<{
    email: z.ZodString;
    code: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    code: string;
}, {
    email: string;
    code: string;
}>;
export declare const ResendVerificationDto: z.ZodObject<{
    email: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
}, {
    email: string;
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
export declare const DeleteAccountDto: z.ZodObject<{
    password: z.ZodOptional<z.ZodString>;
}, "strict", z.ZodTypeAny, {
    password?: string | undefined;
}, {
    password?: string | undefined;
}>;
export declare const DeleteAccountReauthDto: z.ZodObject<{}, "strict", z.ZodTypeAny, {}, {}>;
export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailDto>;
export type RefreshInput = z.infer<typeof RefreshDto>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountDto>;
//# sourceMappingURL=AuthDto.d.ts.map