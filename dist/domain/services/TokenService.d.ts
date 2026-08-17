/**
 * src/domain/services/TokenService.ts
 *
 * Handles JWT access/refresh token creation and verification.
 * Pure service — no DB calls here. Just crypto.
 */
export interface AccessTokenPayload {
    sub: string;
    email: string;
    type: 'access';
    ver: number;
}
export interface RefreshTokenPayload {
    sub: string;
    tokenId: string;
    type: 'refresh';
}
export declare const TokenService: {
    /**
     * Creates a short-lived JWT access token (15 min).
     */
    signAccessToken(userId: string, email: string, tokenVersion?: number): string;
    /**
     * Verifies and decodes an access token. Throws on invalid/expired.
     */
    verifyAccessToken(token: string): AccessTokenPayload;
    /**
     * Creates an opaque refresh token string (stored in DB).
     * NOT a JWT — just a cryptographically random hex string.
     */
    generateRefreshToken(): string;
    hashRefreshToken(token: string): string;
    /**
     * Returns the expiry date for a new refresh token (30 days from now).
     */
    refreshTokenExpiresAt(): Date;
};
//# sourceMappingURL=TokenService.d.ts.map