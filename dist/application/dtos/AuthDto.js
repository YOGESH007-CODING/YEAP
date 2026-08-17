"use strict";
/**
 * src/application/dtos/AuthDto.ts
 *
 * Zod validation schemas for all auth endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeleteAccountReauthDto = exports.DeleteAccountDto = exports.UpdateProfileDto = exports.RefreshDto = exports.ResendVerificationDto = exports.VerifyEmailDto = exports.LoginDto = exports.RegisterDto = void 0;
const zod_1 = require("zod");
exports.RegisterDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(1).max(100).optional(),
    leetcodeUsername: zod_1.z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});
exports.LoginDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.VerifyEmailDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    code: zod_1.z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});
exports.ResendVerificationDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
});
exports.RefreshDto = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.UpdateProfileDto = zod_1.z.object({
    leetcodeUsername: zod_1.z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});
exports.DeleteAccountDto = zod_1.z.object({
    password: zod_1.z.string().min(1).max(128).optional(),
}).strict();
exports.DeleteAccountReauthDto = zod_1.z.object({}).strict();
//# sourceMappingURL=AuthDto.js.map