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
const DeleteAccountUseCase_1 = require("../../../application/use-cases/DeleteAccountUseCase");
const AccountDeletionEmailService_1 = require("../../external/AccountDeletionEmailService");
const requestContext_1 = require("../middleware/requestContext");
const logger_1 = require("../../../shared/utils/logger");
const AccountDeletionCacheService_1 = require("../../external/AccountDeletionCacheService");
const EmailVerificationService_1 = require("../../external/EmailVerificationService");
const isProd = process.env['NODE_ENV'] === 'production';
const VERIFICATION_CODE_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFICATION_ATTEMPTS = 5;
const cookieSameSite = isProd ? 'none' : 'lax';
const refreshCookie = { httpOnly: true, secure: isProd, sameSite: cookieSameSite, path: '/api/auth', maxAge: 30 * 24 * 60 * 60 * 1000 };
const oauthStateCookie = { httpOnly: true, secure: isProd, sameSite: cookieSameSite, path: '/api/auth', maxAge: 10 * 60 * 1000 };
const userResponse = (user) => ({ id: user.id, email: user.email, name: user.name, leetcodeUsername: user.leetcodeUsername, provider: user.provider });
const verificationSecret = () => {
    const secret = process.env['EMAIL_VERIFICATION_SECRET'] ?? process.env['JWT_SECRET'];
    if (!secret || secret.startsWith('your_'))
        throw new Error('Email verification is not configured');
    return secret;
};
const verificationCodeHash = (email, code) => (0, crypto_1.createHmac)('sha256', verificationSecret()).update(`${email}:${code}`).digest('hex');
const createVerificationCode = () => String((0, crypto_1.randomInt)(100000, 1000000));
const safeHashEquals = (left, right) => left.length === right.length && (0, crypto_1.timingSafeEqual)(Buffer.from(left), Buffer.from(right));
const invalidBody = (res, error) => {
    res.status(400).json({ success: false, error: 'Invalid request body', details: error.flatten() });
};
const readCookie = (req, name) => req.headers.cookie
    ?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`))?.slice(name.length + 1);
const readRefreshToken = (req) => readCookie(req, 'yeap_refresh');
const stateCookieName = (provider) => `yeap_oauth_state_${provider}`;
const deletionStateCookieName = (provider) => `yeap_delete_state_${provider}`;
const deletionGrantCookie = 'yeap_delete_reauth';
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
    return { accessToken: TokenService_1.TokenService.signAccessToken(user.id, user.email, user.tokenVersion), refreshToken, user: userResponse(user) };
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
        // This intentionally does not disclose whether an account already exists.
        // It makes automated email enumeration substantially harder.
        if (await prismaClient_1.prisma.user.findUnique({ where: { email } })) {
            res.status(202).json({ success: true, data: { verificationRequired: true } });
            return;
        }
        try {
            const now = new Date();
            const existing = await prismaClient_1.prisma.emailVerification.findUnique({ where: { email } });
            if (existing && existing.lastSentAt.getTime() + VERIFICATION_RESEND_COOLDOWN_MS > now.getTime()) {
                res.status(429).json({ success: false, error: 'Please wait before requesting another verification code.' });
                return;
            }
            const code = createVerificationCode();
            await prismaClient_1.prisma.emailVerification.upsert({
                where: { email },
                create: {
                    email,
                    passwordHash: await bcryptjs_1.default.hash(input.data.password, 12),
                    name: input.data.name,
                    leetcodeUsername: input.data.leetcodeUsername,
                    codeHash: verificationCodeHash(email, code),
                    expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
                    attempts: 0,
                    lastSentAt: now,
                },
                update: {
                    passwordHash: await bcryptjs_1.default.hash(input.data.password, 12),
                    name: input.data.name,
                    leetcodeUsername: input.data.leetcodeUsername,
                    codeHash: verificationCodeHash(email, code),
                    expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS),
                    attempts: 0,
                    lastSentAt: now,
                },
            });
            await (0, EmailVerificationService_1.sendEmailVerificationCode)(email, code);
            res.status(202).json({ success: true, data: { verificationRequired: true } });
        }
        catch (error) {
            logger_1.logger.error('[EmailVerification] Could not start verification', { error: error instanceof Error ? error.message : String(error) });
            res.status(503).json({ success: false, error: 'Unable to send a verification code. Please try again later.' });
        }
    }
    static async resendVerificationCode(req, res) {
        const input = AuthDto_1.ResendVerificationDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const email = input.data.email.toLowerCase();
        const pending = await prismaClient_1.prisma.emailVerification.findUnique({ where: { email } });
        // Generic response prevents this endpoint from becoming an account-enumeration oracle.
        if (!pending || await prismaClient_1.prisma.user.findUnique({ where: { email } })) {
            res.status(202).json({ success: true, data: { verificationRequired: true } });
            return;
        }
        const now = new Date();
        if (pending.lastSentAt.getTime() + VERIFICATION_RESEND_COOLDOWN_MS > now.getTime()) {
            res.status(429).json({ success: false, error: 'Please wait before requesting another verification code.' });
            return;
        }
        try {
            const code = createVerificationCode();
            await prismaClient_1.prisma.emailVerification.update({
                where: { id: pending.id },
                data: { codeHash: verificationCodeHash(email, code), expiresAt: new Date(now.getTime() + VERIFICATION_CODE_TTL_MS), attempts: 0, lastSentAt: now },
            });
            await (0, EmailVerificationService_1.sendEmailVerificationCode)(email, code);
        }
        catch (error) {
            logger_1.logger.error('[EmailVerification] Could not resend verification code', { error: error instanceof Error ? error.message : String(error) });
            res.status(503).json({ success: false, error: 'Unable to send a verification code. Please try again later.' });
            return;
        }
        res.status(202).json({ success: true, data: { verificationRequired: true } });
    }
    static async verifyEmail(req, res) {
        const input = AuthDto_1.VerifyEmailDto.safeParse(req.body);
        if (!input.success)
            return invalidBody(res, input.error);
        const email = input.data.email.toLowerCase();
        try {
            const user = await prismaClient_1.prisma.$transaction(async (db) => {
                const rows = await db.$queryRaw `SELECT id FROM email_verifications WHERE email = ${email} FOR UPDATE`;
                if (!rows[0])
                    return null;
                const pending = await db.emailVerification.findUnique({ where: { id: rows[0].id } });
                if (!pending || pending.expiresAt <= new Date() || pending.attempts >= MAX_VERIFICATION_ATTEMPTS)
                    return null;
                if (!safeHashEquals(pending.codeHash, verificationCodeHash(email, input.data.code))) {
                    await db.emailVerification.update({ where: { id: pending.id }, data: { attempts: { increment: 1 } } });
                    return null;
                }
                const created = await db.user.create({
                    data: { email: pending.email, name: pending.name, leetcodeUsername: pending.leetcodeUsername, passwordHash: pending.passwordHash },
                });
                await db.emailVerification.delete({ where: { id: pending.id } });
                return created;
            });
            if (!user) {
                res.status(400).json({ success: false, error: 'Invalid, expired, or exhausted verification code.' });
                return;
            }
            const session = await issueTokens(prismaClient_1.prisma, user);
            res.cookie('yeap_refresh', session.refreshToken, refreshCookie).status(201).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
        }
        catch (error) {
            if (error.code === 'P2002') {
                const fields = error.meta?.target ?? [];
                if (fields.includes('leetcodeUsername')) {
                    res.status(409).json({ success: false, error: 'This LeetCode username is already linked to another account.' });
                    return;
                }
                res.status(409).json({ success: false, error: 'An account with these details already exists.' });
                return;
            }
            logger_1.logger.error('[EmailVerification] Verification failed', { error: error instanceof Error ? error.message : String(error) });
            res.status(500).json({ success: false, error: 'Verification could not be completed.' });
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
            const deletionState = readCookie(req, deletionStateCookieName(provider));
            res.clearCookie(stateCookieName(provider), { path: '/api/auth' });
            res.clearCookie(deletionStateCookieName(provider), { path: '/api/auth' });
            const stateMatches = (expected) => Boolean(state && expected && state.length === expected.length && (0, crypto_1.timingSafeEqual)(Buffer.from(state), Buffer.from(expected)));
            const isDeletionReauth = stateMatches(deletionState);
            if (!isDeletionReauth && !stateMatches(expectedState))
                return oauthFailure(res, 'invalid_oauth_state');
            const code = typeof req.query['code'] === 'string' ? req.query['code'] : undefined;
            if (!code)
                return oauthFailure(res, 'oauth_authorization_denied');
            try {
                const profile = await fetchOAuthProfile(provider, code);
                if (isDeletionReauth) {
                    const grant = await new DeleteAccountUseCase_1.DeleteAccountUseCase(prismaClient_1.prisma).completeOAuthReauth(profile.provider, state, profile.providerId);
                    if (!grant)
                        return oauthFailure(res, 'account_deletion_reauth_failed');
                    res.cookie(deletionGrantCookie, grant, { ...oauthStateCookie, path: '/api/auth', maxAge: 5 * 60 * 1000 });
                    res.redirect(`${frontendUrl()}/settings?accountDeletion=reauthenticated`);
                    return;
                }
                const user = await findOrCreateOAuthUser(profile);
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
            if (!current || current.user.deletedAt || current.revoked || current.expiresAt <= new Date())
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
        if (result.deletedAt) {
            res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
            return;
        }
        res.cookie('yeap_refresh', refreshToken, refreshCookie).json({ success: true, data: { accessToken: TokenService_1.TokenService.signAccessToken(result.id, result.email, result.tokenVersion), user: userResponse(result) } });
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
    static async beginAccountDeletionReauth(req, res) {
        if (!req.userId || !AuthDto_1.DeleteAccountReauthDto.safeParse(req.body ?? {}).success) {
            res.status(400).json({ success: false, error: 'Request could not be processed' });
            return;
        }
        try {
            const { provider, state } = await new DeleteAccountUseCase_1.DeleteAccountUseCase(prismaClient_1.prisma).createOAuthReauth(req.userId);
            res.cookie(deletionStateCookieName(provider), state, oauthStateCookie);
            const clientId = process.env[provider === 'google' ? 'GOOGLE_CLIENT_ID' : 'GITHUB_CLIENT_ID'];
            if (!configuredOAuthValue(clientId)) {
                res.status(503).json({ success: false, error: 'Request could not be processed' });
                return;
            }
            const url = new URL(provider === 'google' ? 'https://accounts.google.com/o/oauth2/v2/auth' : 'https://github.com/login/oauth/authorize');
            url.searchParams.set('client_id', clientId);
            url.searchParams.set('redirect_uri', callbackUrl(provider));
            url.searchParams.set('response_type', 'code');
            url.searchParams.set('scope', provider === 'google' ? 'openid email profile' : 'read:user user:email');
            url.searchParams.set('state', state);
            res.json({ success: true, data: { authorizationUrl: url.toString() } });
        }
        catch {
            res.status(400).json({ success: false, error: 'Request could not be processed' });
        }
    }
    static async deleteAccount(req, res) {
        const input = AuthDto_1.DeleteAccountDto.safeParse(req.body ?? {});
        if (!req.userId || !input.success) {
            res.status(400).json({ success: false, error: 'Request could not be processed' });
            return;
        }
        const user = await prismaClient_1.prisma.user.findFirst({ where: { id: req.userId, deletedAt: null } });
        if (!user) {
            res.status(401).json({ success: false, error: 'Unauthorized' });
            return;
        }
        const context = { requestId: req.requestId ?? 'unknown', ipHash: (0, requestContext_1.clientIpHash)(req), userAgent: req.header('user-agent') };
        const useCase = new DeleteAccountUseCase_1.DeleteAccountUseCase(prismaClient_1.prisma);
        const deleted = user.provider === client_1.AuthProvider.LOCAL
            ? (input.data.password ? await useCase.deleteLocalAccount(user.id, input.data.password, context) : null)
            : (!input.data.password ? await useCase.deleteOAuthAccount(user.id, readCookie(req, deletionGrantCookie), context) : null);
        if (!deleted) {
            res.status(403).json({ success: false, error: 'Request could not be processed' });
            return;
        }
        res.clearCookie('yeap_refresh', { path: '/api/auth' });
        res.clearCookie(deletionGrantCookie, { path: '/api/auth' });
        logger_1.logger.warn('[AccountDeletion] Account deleted', { userId: deleted.id, requestId: context.requestId, event: 'account_deletion_completed' });
        void (0, AccountDeletionCacheService_1.invalidateAccountCaches)(deleted.id, context.requestId);
        void (0, AccountDeletionEmailService_1.sendAccountDeletionConfirmation)(deleted.email, context.requestId);
        res.status(204).end();
    }
}
exports.AuthController = AuthController;
//# sourceMappingURL=AuthController.js.map