/**
 * src/domain/services/TokenService.ts
 *
 * Handles JWT access/refresh token creation and verification.
 * Pure service — no DB calls here. Just crypto.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// ─── Config ───────────────────────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = '15m';    // Short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // Long-lived, stored in DB

const accessTokenSecret = (): string => {
  const secret = process.env['JWT_SECRET'];
  if (!secret || secret.length < 32 || secret.includes('change-in-production')) {
    throw new Error('JWT_SECRET must be set to a value of at least 32 characters');
  }
  return secret;
};

// ─── Payload Types ────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // User ID
  email: string;
  type: 'access';
  ver: number;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenId: string;   // Maps to RefreshToken.id in DB
  type: 'refresh';
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const TokenService = {
  /**
   * Creates a short-lived JWT access token (15 min).
   */
  signAccessToken(userId: string, email: string, tokenVersion = 0): string {
    const payload: AccessTokenPayload = { sub: userId, email, type: 'access', ver: tokenVersion };
    return jwt.sign(payload, accessTokenSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
  },

  /**
   * Verifies and decodes an access token. Throws on invalid/expired.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = jwt.verify(token, accessTokenSecret()) as AccessTokenPayload;
    if (payload.type !== 'access') throw new Error('Not an access token');
    return payload;
  },

  /**
   * Creates an opaque refresh token string (stored in DB).
   * NOT a JWT — just a cryptographically random hex string.
   */
  generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  },

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  /**
   * Returns the expiry date for a new refresh token (30 days from now).
   */
  refreshTokenExpiresAt(): Date {
    const d = new Date();
    d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    return d;
  },
};
