import { useState } from 'react';
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

export function TopicHeatmap({ topics, loading = false }: TopicHeatmapProps) {
  const [hoveredTopic, setHoveredTopic] = useState<TopicMastery | null>(null);

  const displayTopics = topics.slice(0, 8);

  const getColorClasses = (score: number) => {
    if (score >= 80) return 'bg-[#4bdcc6]/40 border-[#4bdcc6]/30 text-[#4bdcc6]';
    if (score >= 60) return 'bg-[#4bdcc6]/20 border-[#4bdcc6]/20 text-[#4bdcc6]';
    if (score >= 40) return 'bg-[#ffb867]/30 border-[#ffb867]/20 text-[#ffb867]';
    if (score >= 20) return 'bg-[#FF375F]/30 border-[#FF375F]/20 text-[#FF375F]';
    return 'bg-[#201f22] border-white/[0.08] text-[#525866]';
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
          Recall Heatmap
        </div>
        {hoveredTopic && (
          <span className="font-mono text-[10px] text-[#bdc2ff] truncate max-w-[140px]">
            {hoveredTopic.topicName}: {Math.round(hoveredTopic.masteryScore)}%
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="aspect-square bg-[#201f22] rounded animate-pulse" />
          ))}
        </div>
      ) : displayTopics.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {displayTopics.map((t) => (
            <div
              key={t.topicName}
              onMouseEnter={() => setHoveredTopic(t)}
              onMouseLeave={() => setHoveredTopic(null)}
              className={`aspect-square rounded border transition-all duration-200 relative group cursor-pointer flex items-center justify-center p-1 text-center ${getColorClasses(
                t.masteryScore
              )}`}
            >
              <span className="font-mono text-[9px] font-medium truncate w-full group-hover:scale-105 transition-transform">
                {t.topicName.slice(0, 6)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded border border-dashed border-white/[0.08] bg-[#0A0A0C] p-4 text-center">
          <p className="font-mono text-xs text-[#8A8F98]">No topic mastery data yet</p>
          <p className="font-mono text-[10px] text-[#525866] mt-1">Complete reviews to build recall metrics</p>
        </div>
      )}
    </Card>
  );
}
