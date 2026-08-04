import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AuthProvider, Prisma, type PrismaClient, type User } from '@prisma/client';

const REAUTH_TTL_MS = 5 * 60 * 1000;
const hash = (value: string): string => createHash('sha256').update(value).digest('hex');

export type DeletionAuditContext = { requestId: string; ipHash: string; userAgent?: string };

export class DeleteAccountUseCase {
  constructor(private readonly db: PrismaClient) {}

  async createOAuthReauth(userId: string): Promise<{ provider: 'google' | 'github'; state: string }> {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || user.provider === AuthProvider.LOCAL || !user.providerId) throw new Error('REAUTH_NOT_AVAILABLE');
    const state = randomBytes(32).toString('hex');
    await this.db.accountDeletionReauth.create({
      data: { userId, provider: user.provider, stateHash: hash(state), expiresAt: new Date(Date.now() + REAUTH_TTL_MS) },
    });
    return { provider: user.provider === AuthProvider.GOOGLE ? 'google' : 'github', state };
  }

  async completeOAuthReauth(provider: AuthProvider, state: string, providerId: string): Promise<string | null> {
    const now = new Date();
    const challenge = await this.db.accountDeletionReauth.findFirst({
      where: { stateHash: hash(state), provider, expiresAt: { gt: now }, completedAt: null, usedAt: null },
    });
    if (!challenge) return null;
    const user = await this.db.user.findFirst({ where: { id: challenge.userId, deletedAt: null, provider, providerId } });
    if (!user) return null;
    const grant = randomBytes(32).toString('hex');
    const completed = await this.db.accountDeletionReauth.updateMany({
      where: { id: challenge.id, completedAt: null, usedAt: null, expiresAt: { gt: now } },
      data: { completedAt: now, grantHash: hash(grant) },
    });
    return completed.count === 1 ? `${challenge.id}.${grant}` : null;
  }

  async deleteLocalAccount(userId: string, password: string, context: DeletionAuditContext): Promise<User | null> {
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) return null;
    return this.softDelete(user, context);
  }

  async deleteOAuthAccount(userId: string, grant: string | undefined, context: DeletionAuditContext): Promise<User | null> {
    const [challengeId, secret, ...extra] = grant?.split('.') ?? [];
    if (!challengeId || !secret || extra.length || secret.length !== 64) return null;
    const user = await this.db.user.findFirst({ where: { id: userId, deletedAt: null } });
    if (!user || user.provider === AuthProvider.LOCAL) return null;
    const now = new Date();
    return this.db.$transaction(async (tx) => {
      const consumed = await tx.accountDeletionReauth.updateMany({
        where: { id: challengeId, userId, grantHash: hash(secret), completedAt: { not: null }, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (consumed.count !== 1) return null;
      return this.softDeleteInTransaction(tx, user, context);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async softDelete(user: User, context: DeletionAuditContext): Promise<User | null> {
    return this.db.$transaction((tx) => this.softDeleteInTransaction(tx, user, context), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private async softDeleteInTransaction(tx: Prisma.TransactionClient, user: User, context: DeletionAuditContext): Promise<User | null> {
    const deletedAt = new Date();
    const updated = await tx.user.updateMany({
      where: { id: user.id, deletedAt: null },
      data: {
        deletedAt,
        tokenVersion: { increment: 1 },
        // Remove PII and OAuth linkage while preserving a non-identifying soft-delete record.
        email: `deleted-${user.id}@deleted.invalid`, name: null, passwordHash: null,
        provider: AuthProvider.LOCAL, providerId: null, leetcodeUsername: null, telegramChatId: null,
      },
    });
    if (updated.count !== 1) return null;
    await tx.refreshToken.updateMany({ where: { userId: user.id, revoked: false }, data: { revoked: true } });
    await tx.problemProgress.deleteMany({ where: { userId: user.id } });
    await tx.accountDeletionAudit.create({ data: { userId: user.id, requestId: context.requestId, ipHash: context.ipHash, userAgent: context.userAgent?.slice(0, 512) } });
    return user;
  }
}
