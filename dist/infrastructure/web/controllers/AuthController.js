"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const AuthDto_1 = require("../../../application/dtos/AuthDto");
const TokenService_1 = require("../../../domain/services/TokenService");
const prismaClient_1 = require("../../database/prismaClient");
const refreshCookie = { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 30 * 24 * 60 * 60 * 1000 };
const oauthStateCookie = { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 10 * 60 * 1000 };
const userResponse = (user) => ({ id: user.id, email: user.email, name: user.name, leetcodeUsername: user.leetcodeUsername });
const invalidBody = (res, error) => {
    res.status(400).json({ success: false, error: 'Invalid request body', details: error.flatten() });
};
const readCookie = (req, name) => req.headers.cookie
    ?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
const readRefreshToken = (req) => readCookie(req, 'yeap_refresh');
const stateCookieName = (provider) => `yeap_oauth_state_${provider}`;
const callbackUrl = (provider) => {
    const baseUrl = process.env['BACKEND_URL'] ?? `http://localhost:${process.env['PORT'] ?? '3000'}`;
    return `${baseUrl.replace(/\/$/, '')}/api/auth/${provider}/callback`;
};
const frontendUrl = () => (process.env['FRONTEND_URL'] ?? process.env['ALLOWED_ORIGINS']?.split(',')[0] ?? 'http://localhost:3001').replace(/\/$/, '');
const oauthFailure = (res, reason) => { res.redirect(`${frontendUrl()}/login?oauthError=${encodeURIComponent(reason)}`); };
const configuredOAuthValue = (value) => Boolean(value && !value.startsWith('your_'));
const issueTokens = async (db, user) => {
    const refreshToken = TokenService_1.TokenService.generateRefreshToken();
    await db.refreshToken.create({
        data: { token: TokenService_1.TokenService.hashRefreshToken(refreshToken), userId: user.id, expiresAt: TokenService_1.TokenService.refreshTokenExpiresAt() },
    });
    return { accessToken: TokenService_1.TokenService.signAccessToken(user.id, user.email), refreshToken, user: userResponse(user) };
};
const exchangeAuthorizationCode = async (url, parameters) => {
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams(parameters).toString(),
    });
    if (!response.ok)
        throw new Error(`OAuth token exchange failed with ${response.status}`);
    return response.json();
};
const fetchOAuthProfile = async (provider, code) => {
    const isGoogle = provider === 'google';
    const clientId = process.env[isGoogle ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID'];
    const clientSecret = process.env[isGoogle ? 'GOOGLE_CLIENT_SECRET' : 'GITHUB_CLIENT_SECRET'];
    if (!configuredOAuthValue(clientId) || !configuredOAuthValue(clientSecret))
        throw new Error(`${provider} OAuth is not configured`);
    const token = await exchangeAuthorizationCode(isGoogle ? 'https://oauth2.googleapis.com/token' : 'https://github.com/login/oauth/access_token', { client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUrl(provider), grant_type: 'authorization_code' });
    const accessToken = token['access_token'];
    if (typeof accessToken !== 'string')
        throw new Error('OAuth provider did not return an access token');
    if (isGoogle) {
        const response = await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } });
        const profile = await response.json();
        if (!response.ok || !profile.sub || !profile.email || !profile.email_verified)
            throw new Error('Google did not return a verified email address');
        return { email: profile.email.toLowerCase(), name: profile.name ?? null, provider: client_1.AuthProvider.GOOGLE, providerId: profile.sub };
    }
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json', 'User-Agent': 'yeap-srs' };
    const profileResponse = await fetch('https://api.github.com/user', { headers });
    const profile = await profileResponse.json();
    const emailsResponse = await fetch('https://api.github.com/user/emails', { headers });
    const emails = await emailsResponse.json();
    const email = emails.find((entry) => entry.primary && entry.verified) ?? emails.find((entry) => entry.verified);
    if (!profileResponse.ok || !emailsResponse.ok || !profile.id || !email?.email)
        throw new Error('GitHub did not return a verified email address');
    return { email: email.email.toLowerCase(), name: profile.name ?? profile.login ?? null, provider: client_1.AuthProvider.GITHUB, providerId: String(profile.id) };
};
const findOrCreateOAuthUser = async (profile) => {
    const providerUser = await prismaClient_1.prisma.user.findUnique({ where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } } });
    if (providerUser)
        return providerUser;
    const emailUser = await prismaClient_1.prisma.user.findUnique({ where: { email: profile.email } });
    if (emailUser) {
        if (emailUser.provider !== client_1.AuthProvider.LOCAL)
            throw new Error('This email is already linked to a different OAuth provider');
        return prismaClient_1.prisma.user.update({
            where: { id: emailUser.id },
            data: { provider: profile.provider, providerId: profile.providerId, ...(emailUser.name ? {} : { name: profile.name }) },
        });
    }
    try {
        return await prismaClient_1.prisma.user.create({ data: { email: profile.email, name: profile.name, provider: profile.provider, providerId: profile.providerId } });
    }
    catch (error) {
        if (error.code === 'P2002') {
            const user = await prismaClient_1.prisma.user.findUnique({ where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } } });
            if (user)
                return user;
        }
        throw error;
    }
};
class AuthController {
    static async register(req, res) {
        const input = AuthDto_1.RegisterDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const email = input.data.email.toLowerCase();
        if (await prismaClient_1.prisma.user.findUnique({ where: { email } })) {
            res.status(409).json({ success: false, error: 'An account with this email already exists' });
            return;
        }
        try {
            const user = await prismaClient_1.prisma.user.create({ data: { email, name: input.data.name, passwordHash: await bcryptjs_1.default.hash(input.data.password, 12) } });
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
    static oauthStart(provider) {
        return (_req, res) => {
            const clientId = process.env[provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID'];
            const clientSecret = process.env[provider === 'google' ? 'GOOGLE_CLIENT_SECRET' : 'GITHUB_CLIENT_SECRET'];
            if (!configuredOAuthValue(clientId) || !configuredOAuthValue(clientSecret))
                return oauthFailure(res, `${provider}_not_configured`);
            const state = (0, crypto_1.randomBytes)(32).toString('hex');
            res.cookie(stateCookieName(provider), state, oauthStateCookie);
            const url = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://github.com/login/oauth/authorize');
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', callbackUrl(provider));
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('scope', provider === 'google' ? 'openid email profile' : 'read:user user:email');
            url.searchParams.set('state', state);
            res.redirect(url.toString());
        };
    }
    static oauthCallback(provider) {
        return async (req, res) => {
            const state = typeof req.query['state'] === 'string' ? req.query['state'] : undefined;
            const expectedState = readCookie(req, stateCookieName(provider));
            res.clearCookie(stateCookieName(provider), { path: '/api/auth' });
            if (!state || !expectedState || state.length !== expectedState.length || !(0, crypto_1.timingSafeEqual)(Buffer.from(state), Buffer.from(expectedState)))
                return oauthFailure(res, 'invalid_oauth_state');
            const code = typeof req.query['code'] === 'string' ? req.query['code'] : undefined;
            if (!code)
                return oauthFailure(res, 'oauth_authorization_denied');
            try {
                const user = await findOrCreateOAuthUser(await fetchOAuthProfile(provider, code));
                const session = await issueTokens(prismaClient_1.prisma, user);
                res.cookie('yeap_refresh', session.refreshToken, refreshCookie).redirect(`${frontendUrl()}/dashboard`);
            }
            catch {
                oauthFailure(res, 'oauth_sign_in_failed');
            }
        };
    }
    static async refresh(req, res) {
        const input = AuthDto_1.RefreshDto.safeParse({ refreshToken: readRefreshToken(req) ?? req.body?.refreshToken });
        if (!input.success)
            return invalidBody(res, input.error);
        const refreshToken = TokenService_1.TokenService.generateRefreshToken();
        const result = await prismaClient_1.prisma.$transaction(async (db) => {
            const current = await db.refreshToken.findUnique({ where: { token: TokenService_1.TokenService.hashRefreshToken(input.data.refreshToken) }, include: { user: true } });
            if (!current || current.revoked || current.expiresAt <= new Date())
                return null;
            const revoked = await db.refreshToken.updateMany({ where: { id: current.id, revoked: false, expiresAt: { gt: new Date() } }, data: { revoked: true } });
            if (revoked.count !== 1)
                return null;
            await db.refreshToken.create({ data: { token: TokenService_1.TokenService.hashRefreshToken(refreshToken), userId: current.userId, expiresAt: TokenService_1.TokenService.refreshTokenExpiresAt() } });
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
        await prismaClient_1.prisma.refreshToken.updateMany({ where: { token: TokenService_1.TokenService.hashRefreshToken(input.data.refreshToken), revoked: false }, data: { revoked: true } });
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