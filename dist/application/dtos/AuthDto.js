"use strict";
/**
 * src/application/dtos/AuthDto.ts
 *
 * Zod validation schemas for all auth endpoints.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateProfileDto = exports.RefreshDto = exports.GoogleAuthDto = exports.LoginDto = exports.RegisterDto = void 0;
const zod_1 = require("zod");
exports.RegisterDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    name: zod_1.z.string().min(1).max(100).optional(),
});
exports.LoginDto = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
exports.GoogleAuthDto = zod_1.z.object({
    idToken: zod_1.z.string().min(1, 'Google ID token is required'),
});
exports.RefreshDto = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
exports.UpdateProfileDto = zod_1.z.object({
    leetcodeUsername: zod_1.z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});
//# sourceMappingURL=AuthDto.js.map