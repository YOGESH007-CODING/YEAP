import { Flame, Trophy, Snowflake } from 'lucide-react';
import { Card } from '../ui/Card';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakSafeToday: boolean;
  freezesAvailable: number;
}

const nextMilestone = (streak: number) => [7, 14, 21, 30, 60, 100, 180, 365].find((milestone) => milestone > streak) ?? Math.ceil((streak + 1) / 100) * 100;

export function StreakCard({ streak }: { streak: StreakData }) {
  const milestone = nextMilestone(streak.currentStreak);
  const progress = Math.min(100, Math.max(5, Math.round((streak.currentStreak / milestone) * 100)));
  const isPersonalBest = streak.currentStreak > 0 && streak.currentStreak >= streak.longestStreak;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded bg-[#ffb867]/10 flex items-center justify-center text-[#ffb867]">
          <Flame size={18} className={streak.currentStreak > 0 ? 'animate-pulse' : ''} />
        </div>
        <div>
          <div className="font-headline text-base font-semibold text-[#F3F4F6]">
            {streak.currentStreak} Day Streak
          </div>
          <div className="font-mono text-[11px] text-[#8A8F98]">
            {streak.streakSafeToday ? 'Protected today' : 'Keep it up!'}
          </div>
        </div>
      </div>

      <div className="w-full h-1.5 bg-[#201f22] rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-[#ffb867] rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex justify-between font-mono text-[10px] text-[#525866]">
        <span>Current: {streak.currentStreak}d</span>
        <span>Goal: {milestone}d</span>
      </div>

      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between font-mono text-[10px] text-[#8A8F98]">
        <span className="flex items-center gap-1">
          <Trophy size={11} className="text-[#525866]" /> Longest: <b className="text-[#F3F4F6] font-medium">{streak.longestStreak}d</b>
        </span>
        <span className="flex items-center gap-1">
          <Snowflake size={11} className="text-[#525866]" /> Freezes: <b className="text-[#F3F4F6] font-medium">{streak.freezesAvailable}</b>
        </span>
      </div>

      {isPersonalBest && (
        <div className="mt-2 text-[10px] font-mono text-[#bdc2ff] text-center">
          ★ New Personal Record!
        </div>
      )}
    </Card>
  );
}
