"use strict";
/**
 * src/infrastructure/web/middleware/authValidation.ts
 *
 * Validates the application's Bearer access token and attaches
 * the authenticated user's ID to the request context.
 *
 * Access tokens are signed locally by TokenService.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authValidation = void 0;
const TokenService_1 = require("../../../domain/services/TokenService");
const prismaClient_1 = require("../../database/prismaClient");
// ─── JWT Payload Shape ────────────────────────────────────────────────────────
const authValidation = async (req, res, next) => {
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
        const payload = TokenService_1.TokenService.verifyAccessToken(token);
        const user = await prismaClient_1.prisma.user.findFirst({ where: { id: payload.sub, deletedAt: null, tokenVersion: payload.ver } });
        if (!user)
            throw new Error('Session revoked');
        req.userId = payload.sub;
        req.userEmail = payload.email;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            error: 'Invalid or expired access token',
        });
    }
};
exports.authValidation = authValidation;
//# sourceMappingURL=authValidation.js.map