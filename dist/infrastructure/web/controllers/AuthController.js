"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const google_auth_library_1 = require("google-auth-library");
const AuthDto_1 = require("../../../application/dtos/AuthDto");
const TokenService_1 = require("../../../domain/services/TokenService");
const prismaClient_1 = require("../../database/prismaClient");
const googleClient = new google_auth_library_1.OAuth2Client();
const refreshCookie = { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 30 * 24 * 60 * 60 * 1000 };
const userResponse = (user) => ({ id: user.id, email: user.email, name: user.name });
const invalidBody = (res, error) => {
    res.status(400).json({ success: false, error: 'Invalid request body', details: error.flatten() });
};
const readRefreshToken = (req) => req.headers.cookie
    ?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('yeap_refresh='))?.slice('yeap_refresh='.length);
const issueTokens = async (db, user) => {
    const refreshToken = TokenService_1.TokenService.generateRefreshToken();
    await db.refreshToken.create({
        data: {
            token: TokenService_1.TokenService.hashRefreshToken(refreshToken),
            userId: user.id,
            expiresAt: TokenService_1.TokenService.refreshTokenExpiresAt(),
        },
    });
    return { accessToken: TokenService_1.TokenService.signAccessToken(user.id, user.email), refreshToken, user: userResponse(user) };
};
class AuthController {
    static async register(req, res) {
        const input = AuthDto_1.RegisterDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const email = input.data.email.toLowerCase();
        const existing = await prismaClient_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ success: false, error: 'An account with this email already exists' });
            return;
        }
        try {
            const user = await prismaClient_1.prisma.user.create({
                data: { email, name: input.data.name, passwordHash: await bcryptjs_1.default.hash(input.data.password, 12) },
            });
            const session = await issueTokens(prismaClient_1.prisma, user);
            res.cookie('yeap_refresh', session.refreshToken, refreshCookie).status(201).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
        }
        catch (error) {
            if (error.code === 'P2002') {
                res.status(409).json({ success: false, error: 'An account with this email already exists' });
                return;
            }
            throw error;
        }
    }
    static async login(req, res) {
        const input = AuthDto_1.LoginDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const user = await prismaClient_1.prisma.user.findUnique({ where: { email: input.data.email.toLowerCase() } });
        if (!user?.passwordHash || !(await bcryptjs_1.default.compare(input.data.password, user.passwordHash))) {
            res.status(401).json({ success: false, error: 'Invalid email or password' });
            return;
        }
        const session = await issueTokens(prismaClient_1.prisma, user);
        res.cookie('yeap_refresh', session.refreshToken, refreshCookie).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
    }
    static async google(req, res) {
        const input = AuthDto_1.GoogleAuthDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const clientId = process.env['GOOGLE_CLIENT_ID'];
        if (!clientId)
            throw new Error('GOOGLE_CLIENT_ID is not configured');
        const ticket = await googleClient.verifyIdToken({ idToken: input.data.idToken, audience: clientId });
        const payload = ticket.getPayload();
        if (!payload?.sub || !payload.email || !payload.email_verified) {
            res.status(401).json({ success: false, error: 'Google account email is not verified' });
            return;
        }
        const email = payload.email.toLowerCase();
        let user = await prismaClient_1.prisma.user.findUnique({ where: { googleId: payload.sub } });
        if (!user) {
            user = await prismaClient_1.prisma.user.findUnique({ where: { email } });
            user = user
                ? await prismaClient_1.prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } })
                : await prismaClient_1.prisma.user.create({ data: { email, name: payload.name, googleId: payload.sub } });
        }
        const session = await issueTokens(prismaClient_1.prisma, user);
        res.cookie('yeap_refresh', session.refreshToken, refreshCookie).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
    }
    static async refresh(req, res) {
        const input = AuthDto_1.RefreshDto.safeParse({ refreshToken: readRefreshToken(req) ?? req.body?.refreshToken });
        if (!input.success)
            return invalidBody(res, input.error);
        const refreshToken = TokenService_1.TokenService.generateRefreshToken();
        const result = await prismaClient_1.prisma.$transaction(async (db) => {
            const current = await db.refreshToken.findUnique({
                where: { token: TokenService_1.TokenService.hashRefreshToken(input.data.refreshToken) },
                include: { user: true },
            });
            if (!current || current.revoked || current.expiresAt <= new Date())
                return null;
            const revoked = await db.refreshToken.updateMany({
                where: { id: current.id, revoked: false, expiresAt: { gt: new Date() } },
                data: { revoked: true },
            });
            if (revoked.count !== 1)
                return null;
            await db.refreshToken.create({
                data: { token: TokenService_1.TokenService.hashRefreshToken(refreshToken), userId: current.userId, expiresAt: TokenService_1.TokenService.refreshTokenExpiresAt() },
            });
            return current.user;
        });
        if (!result) {
            res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
            return;
        }
        res.cookie('yeap_refresh', refreshToken, refreshCookie).json({ success: true, data: { accessToken: TokenService_1.TokenService.signAccessToken(result.id, result.email), user: userResponse(result) } });
    }
    static async logout(req, res) {
        const input = AuthDto_1.RefreshDto.safeParse({ refreshToken: readRefreshToken(req) ?? req.body?.refreshToken });
        if (!input.success)
            return invalidBody(res, input.error);
        await prismaClient_1.prisma.refreshToken.updateMany({
            where: { token: TokenService_1.TokenService.hashRefreshToken(input.data.refreshToken), revoked: false },
            data: { revoked: true },
        });
        res.clearCookie('yeap_refresh', { path: '/api/auth' }).status(204).end();
    }
    static async updateProfile(req, res) {
        const input = AuthDto_1.UpdateProfileDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        if (!req.userId) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        try {
            const user = await prismaClient_1.prisma.user.update({ where: { id: req.userId }, data: { leetcodeUsername: input.data.leetcodeUsername } });
            res.json({ success: true, data: userResponse(user) });
        }
        catch (error) {
            if (error.code === 'P2002') {
                res.status(409).json({ success: false, error: 'This LeetCode username is already linked' });
                return;
            }
            throw error;
        }
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map