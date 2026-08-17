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
    <Card accent className="p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#5E6AD2]/30 bg-[#5E6AD2]/15 ${streak.currentStreak > 0 ? 'streak-flame' : ''}`}>
            <Flame size={17} className="text-[#A5B4FC]" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[#EDEDEF]">{streak.currentStreak} day streak</h2>
            <p className="mt-0.5 text-xs text-[#8A8F98]">{streak.streakSafeToday ? 'Today is protected.' : 'Complete today’s queue to protect it.'}</p>
          </div>
        </div>
        <div className="order-3 basis-full sm:order-none sm:basis-40">
          <div className="mb-1.5 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-white/35">
            <span>Next</span>
            <span>{streak.currentStreak}/{milestone}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div className="h-full rounded-full bg-[#5E6AD2] streak-progress" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-4 border-l border-white/[0.08] pl-4 text-xs text-[#8A8F98]">
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Trophy size={13} className="text-white/35" /> <b className="font-medium text-[#EDEDEF]">{streak.longestStreak}</b> longest</span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Snowflake size={13} className="text-white/35" /> <b className="font-medium text-[#EDEDEF]">{streak.freezesAvailable}</b> freezes</span>
        </div>
      </div>
      {isPersonalBest && <div className="mt-3 flex items-center gap-1.5 border-t border-white/[0.06] pt-3 text-[11px] text-[#8A8F98]"><ShieldCheck size={13} className="text-[#8B94E5]" /> You’re matching your personal best.</div>}
    </Card>
  );
}
