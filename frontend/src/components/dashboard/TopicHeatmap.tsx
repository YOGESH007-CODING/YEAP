import { BarChart3, Info } from 'lucide-react';
import { useId, useState } from 'react';
import { Card } from '../ui/Card';

export interface TopicMastery {
  topicName: string;
  masteryScore: number;
  totalAttempts: number;
}

interface TopicHeatmapProps {
  topics: TopicMastery[];
  loading?: boolean;
}

const heatLevel = (score: number) => {
  if (score >= 80) return 4;
  if (score >= 60) return 3;
  if (score >= 35) return 2;
  if (score > 0) return 1;
  return 0;
};

const heatStyles = [
  'border-white/[0.06] bg-white/[0.025] text-white/40',
  'border-[#5E6AD2]/20 bg-[#5E6AD2]/10 text-[#A5B4FC]',
  'border-[#5E6AD2]/30 bg-[#5E6AD2]/18 text-[#C7D2FE]',
  'border-[#5E6AD2]/45 bg-[#5E6AD2]/30 text-white',
  'border-[#6872D9]/60 bg-[#6872D9]/50 text-white',
];

function TopicCell({ topic }: { topic: TopicMastery }) {
  const [active, setActive] = useState(false);
  const tooltipId = useId();
  const score = Math.max(0, Math.min(100, Math.round(topic.masteryScore)));
  const lowActivity = topic.totalAttempts < 3;
  const level = heatLevel(score);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        className={`group w-full rounded-xl border p-3 text-left transition-all duration-200 ease-out focus-visible:relative focus-visible:z-10 hover:-translate-y-0.5 hover:border-white/[0.16] hover:shadow-[0_8px_24px_rgba(0,0,0,0.28)] ${heatStyles[level]}`}
        onMouseEnter={() => setActive(true)}
        onMouseLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        aria-describedby={tooltipId}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-xs font-medium text-[#EDEDEF]">{topic.topicName}</span>
          <span className="font-mono text-[10px] font-medium tabular-nums">{score}%</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 font-mono text-[10px] tracking-wide text-white/40">
          <span>{lowActivity ? 'Building' : `${topic.totalAttempts} reviews`}</span>
          <span className="h-1.5 w-8 overflow-hidden rounded-full bg-black/15">
            <span className="block h-full rounded-full bg-white/80 transition-[width] duration-500 ease-out" style={{ width: `${score}%` }} />
          </span>
        </div>
      </button>
      <div
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 w-48 -translate-x-1/2 rounded-lg border border-white/[0.10] bg-[#0a0a0c] px-3 py-2 text-left text-[11px] leading-relaxed text-[#8A8F98] shadow-[0_12px_30px_rgba(0,0,0,0.45)] transition-all duration-150 ${active ? 'visible translate-y-0 opacity-100' : 'invisible translate-y-1 opacity-0'}`}
      >
        <span className="font-medium text-[#EDEDEF]">{topic.topicName}</span> is at {score}% mastery from {topic.totalAttempts} review{topic.totalAttempts === 1 ? '' : 's'}.
      </div>
    </div>
  );
}

export function TopicHeatmap({ topics, loading = false }: TopicHeatmapProps) {
  const visibleTopics = topics.slice(0, 6);
  const average = visibleTopics.length
    ? Math.round(visibleTopics.reduce((sum, topic) => sum + topic.masteryScore, 0) / visibleTopics.length)
    : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={15} className="text-[#8B94E5]" />
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98]">Topic mastery</h3>
          </div>
          <p className="mt-1 text-xs text-[#8A8F98]">Recall by pattern.</p>
        </div>
        {visibleTopics.length > 0 && <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{average}% avg</span>}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Loading topic mastery">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-xl border border-white/[0.05] bg-white/[0.025]" />)}
        </div>
      ) : visibleTopics.length > 0 ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {visibleTopics.map((topic) => <TopicCell key={topic.topicName} topic={topic} />)}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3 font-mono text-[10px] tracking-wide text-white/35">
            <span className="flex items-center gap-1.5"><Info size={11} /> Hover a topic for detail</span>
            <span>{topics.length > visibleTopics.length ? `${topics.length - visibleTopics.length} more topics` : 'Updated after reviews'}</span>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-white/[0.10] bg-white/[0.02] px-4 py-5 text-center">
          <p className="text-sm font-medium text-[#EDEDEF]">Your topic map will build here</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8A8F98]">Complete a few reviews to see where your recall is strongest and where to focus next.</p>
        </div>
      )}
    </Card>
  );
}
