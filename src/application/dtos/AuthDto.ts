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
});

export const LoginDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const GoogleAuthDto = z.object({
  idToken: z.string().min(1, 'Google ID token is required'),
});

export const RefreshDto = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const UpdateProfileDto = z.object({
  leetcodeUsername: z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid LeetCode username'),
});

export type RegisterInput = z.infer<typeof RegisterDto>;
export type LoginInput = z.infer<typeof LoginDto>;
export type GoogleAuthInput = z.infer<typeof GoogleAuthDto>;
export type RefreshInput = z.infer<typeof RefreshDto>;
