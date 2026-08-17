"use strict";
/**
 * src/domain/services/TokenService.ts
 *
 * Handles JWT access/refresh token creation and verification.
 * Pure service — no DB calls here. Just crypto.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
// ─── Config ───────────────────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived
const REFRESH_TOKEN_EXPIRY_DAYS = 30; // Long-lived, stored in DB
const accessTokenSecret = () => {
    const secret = process.env['JWT_SECRET'];
    if (!secret || secret.length < 32 || secret.includes('change-in-production')) {
        throw new Error('JWT_SECRET must be set to a value of at least 32 characters');
    }
    return secret;
};
// ─── Service ──────────────────────────────────────────────────────────────────
exports.TokenService = {
    /**
     * Creates a short-lived JWT access token (15 min).
     */
    signAccessToken(userId, email, tokenVersion = 0) {
        const payload = { sub: userId, email, type: 'access', ver: tokenVersion };
        return jsonwebtoken_1.default.sign(payload, accessTokenSecret(), { expiresIn: ACCESS_TOKEN_EXPIRY });
    },
    /**
     * Verifies and decodes an access token. Throws on invalid/expired.
     */
    verifyAccessToken(token) {
        const payload = jsonwebtoken_1.default.verify(token, accessTokenSecret());
        if (payload.type !== 'access')
            throw new Error('Not an access token');
        return payload;
    },
    /**
     * Creates an opaque refresh token string (stored in DB).
     * NOT a JWT — just a cryptographically random hex string.
     */
    generateRefreshToken() {
        return crypto_1.default.randomBytes(40).toString('hex');
    },
    hashRefreshToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    },
    /**
     * Returns the expiry date for a new refresh token (30 days from now).
     */
    refreshTokenExpiresAt() {
        const d = new Date();
        d.setDate(d.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
        return d;
    },
};
//# sourceMappingURL=TokenService.js.map