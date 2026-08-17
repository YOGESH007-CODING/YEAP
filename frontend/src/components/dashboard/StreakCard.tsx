import { Flame, ShieldCheck, Snowflake, Trophy } from 'lucide-react';
import { Card } from '../ui/Card';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakSafeToday: boolean;
  freezesAvailable: number;
}

const nextMilestone = (streak: number) => [7, 14, 30, 60, 100, 180, 365].find((milestone) => milestone > streak) ?? Math.ceil((streak + 1) / 100) * 100;

export function StreakCard({ streak }: { streak: StreakData }) {
  const milestone = nextMilestone(streak.currentStreak);
  const progress = Math.min(100, Math.round((streak.currentStreak / milestone) * 100));
  const isPersonalBest = streak.currentStreak > 0 && streak.currentStreak >= streak.longestStreak;

  return (
    <Card accent className="overflow-hidden p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/15 ${streak.currentStreak > 0 ? 'streak-flame' : ''}`}>
            <Flame size={19} className="text-[#A5B4FC]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#EDEDEF]">Current streak</h2>
            <p className="mt-0.5 text-xs text-[#8A8F98]">{streak.streakSafeToday ? 'Today is protected.' : 'Complete today’s queue to protect it.'}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold leading-none tracking-tight text-[#EDEDEF] tabular-nums">{streak.currentStreak}</div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-white/35">days</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/35">
          <span>Next milestone</span>
          <span>{streak.currentStreak}/{milestone} days</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
          <div className="h-full rounded-full bg-[#5E6AD2] streak-progress" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-4">
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.05]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/35"><Trophy size={12} /> Longest</div>
          <p className="mt-1 text-sm font-medium text-[#EDEDEF]">{streak.longestStreak} day{streak.longestStreak === 1 ? '' : 's'}{isPersonalBest ? <span className="ml-1 text-[#A5B4FC]">best</span> : null}</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5 transition-colors duration-200 hover:bg-white/[0.05]">
          <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-white/35"><Snowflake size={12} /> Freezes</div>
          <p className="mt-1 text-sm font-medium text-[#EDEDEF]">{streak.freezesAvailable} available</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[11px] text-[#8A8F98]">
        <ShieldCheck size={13} className={streak.streakSafeToday ? 'text-[#8B94E5]' : 'text-white/35'} />
        {streak.streakSafeToday ? 'Nothing due today — your streak is safe.' : 'A completed review keeps your streak alive.'}
      </div>
    </Card>
  );
}
