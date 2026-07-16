/**
 * src/infrastructure/web/middleware/authValidation.ts
 *
 * Validates the application's Bearer access token and attaches
 * the authenticated user's ID to the request context.
 *
 * Access tokens are signed locally by TokenService.
 */

import type { Request, Response, NextFunction } from 'express';
import { TokenService } from '../../../domain/services/TokenService';

// ─── Extended Request Type ────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      userEmail?: string;
    }
  }
}

// ─── JWT Payload Shape ────────────────────────────────────────────────────────

export const authValidation = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Missing or malformed Authorization header. Expected: Bearer <token>',
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = TokenService.verifyAccessToken(token);

    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired access token',
    });
  }
};
