import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  Flame,
  Layers,
  ArrowRight,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  ArrowUpDown,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../lib/api';
import { Card } from '../components/ui/Card';
import { DifficultyBadge } from '../components/ui/Badge';
import { SearchCombobox } from '../components/SearchCombobox';
import { TopicHeatmap, type TopicMastery } from '../components/dashboard/TopicHeatmap';
import { StreakCard, type StreakData } from '../components/dashboard/StreakCard';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topicTags: string[];
  companyTags: string[];
}

interface DueItem {
  progressId: string;
  problem: Problem;
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt: string | null;
}

interface DueResponse {
  success: boolean;
  data: {
    count: number;
    totalTracked?: number;
    items: DueItem[];
    bonusQuestions: Problem[];
  };
}

interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    newlyTracked: { problemId: string; title: string }[];
  };
}

interface HeatmapResponse {
  success: boolean;
  data: { topics: TopicMastery[] };
}

interface StreakResponse {
  success: boolean;
  data: StreakData;
}

export function DashboardPage() {
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<Problem[]>([]);
  const [totalTracked, setTotalTracked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([
    '> INIT lc_sync v2.4',
    '> engine: SM-2 spaced repetition',
    '> status: ready for practice',
  ]);
  const [topics, setTopics] = useState<TopicMastery[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [streak, setStreak] = useState<StreakResponse['data'] | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void loadDue();
    void loadHeatmap();
    void loadStreak();
  }, []);

  async function loadHeatmap() {
    try {
      const res = await api.get<HeatmapResponse>('/api/trackers/topics/heatmap');
      setTopics(res.data.topics);
    } catch {
      // optional
    } finally {
      setHeatmapLoading(false);
    }
  }

  async function loadStreak() {
    try {
      const res = await api.get<StreakResponse>('/api/streak');
      setStreak(res.data);
    } catch {
      // optional
    }
  }

  async function loadDue(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get<DueResponse>('/api/review/due');
      const items = res.data.items ?? [];
      setDueItems(items);
      setBonusQuestions(res.data.bonusQuestions ?? []);
      setTotalTracked(res.data.totalTracked ?? items.length);
    } catch (error) {
      console.error('Failed to load due items:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncLogs((prev) => [...prev, `> [${new Date().toLocaleTimeString()}] Fetching recent LeetCode solves...`]);
    try {
      const res = await api.post<SyncResponse>('/api/review/sync');
      setSyncLogs((prev) => [
        ...prev,
        `> SUCCESS: ${res.data.newlyTracked.length} new solves detected.`,
        '> scheduling via SRS algorithm...',
        '> SYNC COMPLETE.',
      ]);
      await loadDue(false);
    } catch (error) {
      setSyncLogs((prev) => [
        ...prev,
        `> ERROR: ${error instanceof Error ? error.message : 'Sync failed'}.`,
      ]);
    } finally {
      setSyncing(false);
    }
  }

  const factors = dueItems.map((item) => Number(item.easinessFactor)).filter(Number.isFinite);
  const criticalCount = factors.filter((factor) => factor < 1.8).length;
  const avgEF = factors.length ? (factors.reduce((sum, factor) => sum + factor, 0) / factors.length).toFixed(2) : '2.50';

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Top Metric Ribbon (4 columns) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {/* Metric 1: Due Today */}
        <div className="bg-[#050506] border border-white/[0.08] rounded-lg p-4 noise-bg flex items-center gap-3.5 hover:border-[rgba(94,106,210,0.3)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#4bdcc6]/10 flex items-center justify-center text-[#4bdcc6] shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-wider mb-0.5">
              Due Today
            </div>
            <div className="font-mono text-2xl font-bold text-[#4bdcc6]">
              {dueItems.length}
            </div>
          </div>
        </div>

        {/* Metric 2: Critical (EF < 1.8) */}
        <div className="bg-[#050506] border border-white/[0.08] rounded-lg p-4 noise-bg flex items-center gap-3.5 hover:border-[rgba(94,106,210,0.3)] transition-colors relative overflow-hidden">
          {criticalCount > 0 && <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#FF375F]" />}
          <div className="w-10 h-10 rounded-full bg-[#FF375F]/10 flex items-center justify-center text-[#FF375F] shrink-0">
            <AlertTriangle size={18} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-wider mb-0.5">
              Critical (EF &lt; 1.8)
            </div>
            <div className="font-mono text-2xl font-bold text-[#FF375F]">
              {criticalCount}
            </div>
          </div>
        </div>

        {/* Metric 3: Avg EF */}
        <div className="bg-[#050506] border border-white/[0.08] rounded-lg p-4 noise-bg flex items-center gap-3.5 hover:border-[rgba(94,106,210,0.3)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#ffb867]/10 flex items-center justify-center text-[#ffb867] shrink-0">
            <Flame size={18} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-wider mb-0.5">
              Avg EF
            </div>
            <div className="font-mono text-2xl font-bold text-[#ffb867]">
              {avgEF}x
            </div>
          </div>
        </div>

        {/* Metric 4: Total Queue */}
        <div className="bg-[#050506] border border-white/[0.08] rounded-lg p-4 noise-bg flex items-center gap-3.5 hover:border-[rgba(94,106,210,0.3)] transition-colors">
          <div className="w-10 h-10 rounded-full bg-[#5e6ad2]/15 flex items-center justify-center text-[#bdc2ff] shrink-0">
            <Layers size={18} />
          </div>
          <div>
            <div className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-wider mb-0.5">
              Total Queue
            </div>
            <div className="font-mono text-2xl font-bold text-[#F3F4F6]">
              {totalTracked}
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Stream (8-col) and Right Sidebar (4-col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8-col) */}
        <div className="lg:col-span-8 flex flex-col gap-5">
          {/* Section Header */}
          <div className="flex justify-between items-end pb-1 border-b border-white/[0.06]">
            <div>
              <h2 className="font-headline text-xl font-semibold text-[#F3F4F6]">
                Review Stream
              </h2>
              <p className="font-mono text-[11px] text-[#8A8F98] mt-0.5">
                Next optimized intervals ready for processing.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/history')}
                className="p-1.5 text-[#8A8F98] hover:text-[#bdc2ff] transition-colors bg-[#201f22] rounded border border-white/[0.08] cursor-pointer"
                title="Filter problems in Problem Lab"
              >
                <SlidersHorizontal size={14} />
              </button>
              <button
                onClick={() => navigate('/history')}
                className="p-1.5 text-[#8A8F98] hover:text-[#bdc2ff] transition-colors bg-[#201f22] rounded border border-white/[0.08] cursor-pointer"
                title="Sort catalog"
              >
                <ArrowUpDown size={14} />
              </button>
            </div>
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="py-16 text-center font-mono text-xs text-[#8A8F98]">
              Streaming recall priorities...
            </div>
          ) : dueItems.length === 0 && bonusQuestions.length === 0 ? (
            <Card className="py-12 px-6 text-center">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#4bdcc6]/10 text-[#4bdcc6] flex items-center justify-center mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-headline text-lg font-semibold text-[#F3F4F6] mb-1">
                Queue Synchronized & Clear
              </h3>
              <p className="font-mono text-xs text-[#8A8F98] max-w-sm mx-auto">
                No cards due right now. Sync with LeetCode or explore problems from the catalog.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Due Queue Problem Cards */}
              {dueItems.map((item) => (
                <div
                  key={item.progressId}
                  onClick={() => navigate(`/review/${item.problem.slug}`)}
                  className="bg-[#050506] border border-white/[0.08] rounded-lg p-4 noise-bg hover:border-[#bdc2ff]/40 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1 pr-4">
                      <h3 className="font-headline text-sm font-semibold text-[#F3F4F6] group-hover:text-[#bdc2ff] transition-colors truncate">
                        {item.problem.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <DifficultyBadge difficulty={item.problem.difficulty} />
                        {item.problem.topicTags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#201f22] text-[#8A8F98] border border-white/[0.06]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right shrink-0">
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-[#525866] uppercase">EF</span>
                        <span
                          className={`font-mono text-sm font-semibold ${
                            item.easinessFactor < 1.8 ? 'text-[#FF375F]' : 'text-[#F3F4F6]'
                          }`}
                        >
                          {item.easinessFactor.toFixed(1)}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-[#525866] uppercase">INT</span>
                        <span className="font-mono text-sm font-semibold text-[#F3F4F6]">
                          {item.intervalDays}d
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-mono text-[9px] text-[#525866] uppercase">REP</span>
                        <span className="font-mono text-sm font-semibold text-[#F3F4F6]">
                          {String(item.repetitions).padStart(2, '0')}
                        </span>
                      </div>
                      <ArrowRight size={14} className="text-[#525866] group-hover:text-[#bdc2ff] transition-colors ml-1" />
                    </div>
                  </div>
                </div>
              ))}

              {/* Bonus FAANG Queue Cards (if available) */}
              {bonusQuestions.map((problem) => (
                <div
                  key={problem.id}
                  onClick={() => navigate(`/review/${problem.slug}`)}
                  className="bg-[#0A0A0C] border border-[rgba(94,106,210,0.35)] rounded-lg p-4 noise-bg relative cursor-pointer hover:border-[#bdc2ff] transition-all group shadow-[0_0_20px_rgba(94,106,210,0.06)]"
                >
                  <div className="absolute -top-2.5 left-4 bg-[#020203] px-2 font-mono text-[9px] text-[#bdc2ff] border border-[rgba(94,106,210,0.4)] rounded uppercase tracking-wider flex items-center gap-1">
                    <Sparkles size={9} /> BONUS FAANG QUEUE
                  </div>
                  <div className="flex justify-between items-start mt-1">
                    <div className="min-w-0 flex-1 pr-4">
                      <h3 className="font-headline text-sm font-semibold text-[#F3F4F6] group-hover:text-[#bdc2ff] transition-colors truncate">
                        {problem.title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <DifficultyBadge difficulty={problem.difficulty} />
                        {problem.companyTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#201f22] text-[#bdc2ff] border border-[rgba(94,106,210,0.2)]"
                          >
                            {tag}
                          </span>
                        ))}
                        {problem.topicTags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#201f22] text-[#8A8F98] border border-white/[0.06]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-[#bdc2ff] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Review Now <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar (4-col) */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          {/* Report / Search Combobox */}
          <div>
            <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-[#8A8F98] mb-1.5">
              Problem Lookup
            </div>
            <SearchCombobox />
          </div>

          {/* 14 Day Streak Card */}
          {streak && <StreakCard streak={streak} />}

          {/* Topic Recall Heatmap */}
          <TopicHeatmap topics={topics} loading={heatmapLoading} />

          {/* LeetCode Sync Log Terminal */}
          <Card className="p-0 overflow-hidden flex flex-col h-52">
            <div className="px-4 py-2.5 border-b border-white/[0.08] bg-[#1c1b1e] flex justify-between items-center">
              <span className="font-mono text-[11px] font-medium text-[#8A8F98]">Sync Terminal</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-[10px] font-mono text-[#bdc2ff] hover:text-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
                  <span>Sync</span>
                </button>
                <span className={`w-2 h-2 rounded-full ${syncing ? 'bg-[#ffb867] animate-ping' : 'bg-[#4bdcc6] animate-pulse'}`} />
              </div>
            </div>
            <div className="p-3.5 flex-1 overflow-y-auto font-mono text-[11px] text-[#525866] flex flex-col gap-1 bg-[#050506]">
              {syncLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('SUCCESS')
                      ? 'text-[#4bdcc6]'
                      : log.includes('ERROR')
                      ? 'text-[#FF375F]'
                      : log.includes('INIT') || log.includes('COMPLETE')
                      ? 'text-[#8A8F98]'
                      : 'text-[#525866]'
                  }
                >
                  {log}
                </div>
              ))}
              <div className="mt-1 animate-pulse text-[#bdc2ff]">_</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
