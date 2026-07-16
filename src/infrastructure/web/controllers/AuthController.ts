import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import type { Request, Response } from 'express';
import type { PrismaClient, User } from '@prisma/client';
import { RegisterDto, LoginDto, GoogleAuthDto, RefreshDto, UpdateProfileDto } from '../../../application/dtos/AuthDto';
import { TokenService } from '../../../domain/services/TokenService';
import { prisma } from '../../database/prismaClient';

const googleClient = new OAuth2Client();
type PublicUser = Pick<User, 'id' | 'email' | 'name'>;
const refreshCookie = { httpOnly: true, secure: process.env['NODE_ENV'] === 'production', sameSite: 'lax' as const, path: '/api/auth', maxAge: 30 * 24 * 60 * 60 * 1000 };

const userResponse = (user: PublicUser) => ({ id: user.id, email: user.email, name: user.name });

const invalidBody = (res: Response, error: { flatten: () => unknown }): void => {
  res.status(400).json({ success: false, error: 'Invalid request body', details: error.flatten() });
};

const readRefreshToken = (req: Request): string | undefined => req.headers.cookie
  ?.split(';').map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith('yeap_refresh='))?.slice('yeap_refresh='.length);

const issueTokens = async (db: PrismaClient, user: PublicUser) => {
  const refreshToken = TokenService.generateRefreshToken();
  await db.refreshToken.create({
    data: {
      token: TokenService.hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: TokenService.refreshTokenExpiresAt(),
    },
  });
  return { accessToken: TokenService.signAccessToken(user.id, user.email), refreshToken, user: userResponse(user) };
};

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    const input = RegisterDto.safeParse(req.body);
    if (!input.success) return invalidBody(res, input.error);

    const email = input.data.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    try {
      const user = await prisma.user.create({
        data: { email, name: input.data.name, passwordHash: await bcrypt.hash(input.data.password, 12) },
      });
      const session = await issueTokens(prisma, user);
      res.cookie('yeap_refresh', session.refreshToken, refreshCookie).status(201).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, error: 'An account with this email already exists' });
        return;
      }
      throw error;
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    const input = LoginDto.safeParse(req.body);
    if (!input.success) return invalidBody(res, input.error);

    const user = await prisma.user.findUnique({ where: { email: input.data.email.toLowerCase() } });
    if (!user?.passwordHash || !(await bcrypt.compare(input.data.password, user.passwordHash))) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }
    const session = await issueTokens(prisma, user);
    res.cookie('yeap_refresh', session.refreshToken, refreshCookie).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
  }

  static async google(req: Request, res: Response): Promise<void> {
    const input = GoogleAuthDto.safeParse(req.body);
    if (!input.success) return invalidBody(res, input.error);

    const clientId = process.env['GOOGLE_CLIENT_ID'];
    if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not configured');
    const ticket = await googleClient.verifyIdToken({ idToken: input.data.idToken, audience: clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) {
      res.status(401).json({ success: false, error: 'Google account email is not verified' });
      return;
    }

    const email = payload.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      user = user
        ? await prisma.user.update({ where: { id: user.id }, data: { googleId: payload.sub } })
        : await prisma.user.create({ data: { email, name: payload.name, googleId: payload.sub } });
    }
    const session = await issueTokens(prisma, user);
    res.cookie('yeap_refresh', session.refreshToken, refreshCookie).json({ success: true, data: { accessToken: session.accessToken, user: session.user } });
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const input = RefreshDto.safeParse({ refreshToken: readRefreshToken(req) ?? req.body?.refreshToken });
    if (!input.success) return invalidBody(res, input.error);

    const refreshToken = TokenService.generateRefreshToken();
    const result = await prisma.$transaction(async (db) => {
      const current = await db.refreshToken.findUnique({
        where: { token: TokenService.hashRefreshToken(input.data.refreshToken) },
        include: { user: true },
      });
      if (!current || current.revoked || current.expiresAt <= new Date()) return null;

      const revoked = await db.refreshToken.updateMany({
        where: { id: current.id, revoked: false, expiresAt: { gt: new Date() } },
        data: { revoked: true },
      });
      if (revoked.count !== 1) return null;

      await db.refreshToken.create({
        data: { token: TokenService.hashRefreshToken(refreshToken), userId: current.userId, expiresAt: TokenService.refreshTokenExpiresAt() },
      });
      return current.user;
    });

    if (!result) {
      res.status(401).json({ success: false, error: 'Invalid or expired refresh token' });
      return;
    }
    res.cookie('yeap_refresh', refreshToken, refreshCookie).json({ success: true, data: { accessToken: TokenService.signAccessToken(result.id, result.email), user: userResponse(result) } });
  }

  static async logout(req: Request, res: Response): Promise<void> {
    const input = RefreshDto.safeParse({ refreshToken: readRefreshToken(req) ?? req.body?.refreshToken });
    if (!input.success) return invalidBody(res, input.error);
    await prisma.refreshToken.updateMany({
      where: { token: TokenService.hashRefreshToken(input.data.refreshToken), revoked: false },
      data: { revoked: true },
    });
    res.clearCookie('yeap_refresh', { path: '/api/auth' }).status(204).end();
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    const input = UpdateProfileDto.safeParse(req.body);
    if (!input.success) return invalidBody(res, input.error);
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }
    try {
      const user = await prisma.user.update({ where: { id: req.userId }, data: { leetcodeUsername: input.data.leetcodeUsername } });
      res.json({ success: true, data: userResponse(user) });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        res.status(409).json({ success: false, error: 'This LeetCode username is already linked' });
        return;
      }
      throw error;
    }
  }
}
