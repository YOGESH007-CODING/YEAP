import type { PrismaClient } from '@prisma/client';

const DAY = 86_400_000;
const streakDay = (now = new Date()): Date => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (now.getUTCHours() < 4 ? 1 : 0)));
const dayCutoff = (day: Date): Date => new Date(day.getTime() + 4 * 60 * 60 * 1000);

/** Uses the same 04:00 UTC boundary as the review queue. */
export class StreakService {
  constructor(private readonly db: PrismaClient) {}

  async evaluate(userId: string, reviewedDueProblem: boolean): Promise<{ currentStreak: number; longestStreak: number; streakSafeToday: boolean; freezesAvailable: number }> {
    const today = streakDay();
    const dueCount = await this.db.problemProgress.count({ where: { userId, dueDate: { lte: dayCutoff(today) } } });
    const safe = dueCount === 0;
    const existing = await this.db.userStreak.upsert({ where: { userId }, create: { userId, streakSafeToday: safe }, update: { streakSafeToday: safe } });
    if (!safe || (!reviewedDueProblem && dueCount > 0)) return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, streakSafeToday: false, freezesAvailable: existing.freezesAvailable };
    if (existing.lastStreakDate?.getTime() === today.getTime()) return { currentStreak: existing.currentStreak, longestStreak: existing.longestStreak, streakSafeToday: true, freezesAvailable: existing.freezesAvailable };

    const elapsed = existing.lastStreakDate ? Math.round((today.getTime() - existing.lastStreakDate.getTime()) / DAY) : 0;
    let freezes = existing.freezesAvailable;
    let refreshedAt = existing.freezeRefreshedAt;
    const renewals = Math.floor((today.getTime() - refreshedAt.getTime()) / (30 * DAY));
    if (renewals > 0) { freezes = Math.min(2, freezes + renewals); refreshedAt = new Date(refreshedAt.getTime() + renewals * 30 * DAY); }
    const useFreeze = elapsed === 2 && freezes > 0;
    const currentStreak = elapsed === 1 || useFreeze ? existing.currentStreak + 1 : 1;
    if (useFreeze) freezes--;
    const updated = await this.db.userStreak.update({ where: { userId }, data: { currentStreak, longestStreak: Math.max(existing.longestStreak, currentStreak), lastStreakDate: today, streakSafeToday: true, freezesAvailable: freezes, freezeRefreshedAt: refreshedAt } });
    return { currentStreak: updated.currentStreak, longestStreak: updated.longestStreak, streakSafeToday: true, freezesAvailable: updated.freezesAvailable };
  }
}
