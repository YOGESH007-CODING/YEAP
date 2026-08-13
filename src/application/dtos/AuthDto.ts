/**
 * src/application/dtos/AuthDto.ts
 *
 * Zod validation schemas for all auth endpoints.
 */

import { z } from 'zod';

export const RegisterDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
  leetcodeUsername: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});

export const LoginDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const VerifyEmailDto = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
});

export const ResendVerificationDto = z.object({
  email: z.string().email('Invalid email address'),
});

export const RefreshDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const UpdateProfileDto = z.object({
  leetcodeUsername: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});

export const DeleteAccountDto = z.object({
  password: z.string().min(1).max(128).optional(),
}).strict();

export const DeleteAccountReauthDto = z.object({}).strict();

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type VerifyEmailInput = z.infer<typeof VerifyEmailDto>;
export type RefreshInput = z.infer<typeof RefreshDto>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountDto>;
