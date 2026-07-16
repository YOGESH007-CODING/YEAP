import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Flame, CheckCircle, ArrowRight } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, DifficultyBadge } from '../components/ui/Badge';
import { SearchCombobox } from '../components/SearchCombobox';

interface DueItem {
  progressId: string;
  problem: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    topicTags: string[];
    companyTags: string[];
  };
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt: string | null;
}

interface DueResponse {
  success: boolean;
  data: { count: number; items: DueItem[] };
}

interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    totalSubmissionsToday: number;
    newlyTracked: { problemId: string; slug: string; title: string; difficulty: string }[];
    alreadyTracked: { problemId: string; slug: string; title: string }[];
    pendingQualityScores: { problemId: string; slug: string; title: string }[];
  };
}

export function DashboardPage() {
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadDue();
  }, []);

  async function loadDue() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<DueResponse>('/api/review/due');
      setDueItems(res.data.items);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load due problems');
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await api.post<SyncResponse>('/api/review/sync');
      setSyncResult(res);
      loadDue();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'LeetCode sync failed');
    } finally {
      setSyncing(false);
    }
  }

  const criticalCount = dueItems.filter(i => i.easinessFactor < 1.8).length;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* ── Marquee Ticker ────────────────────────────────────── */}
      {error && <div className="mb-6 border border-[#CC0000] bg-red-50 p-4 text-sm text-[#CC0000]">{error} <button className="underline" onClick={loadDue}>Retry</button></div>}
      <div className="bg-[#111] text-[#F9F9F7] border border-[#111] overflow-hidden mb-8">
        <div className="flex items-center gap-8 py-2 px-4 animate-marquee whitespace-nowrap">
          {[
            `${dueItems.length} problems due today`,
            `${criticalCount} critical (EF < 1.8)`,
            'SM-2 spaced repetition active',
            'Zero external API calls in daily flow',
          ].map((text, i) => (
            <span key={i} className="font-data text-xs uppercase tracking-widest flex items-center gap-3">
              <span className="inline-block h-1.5 w-1.5 bg-[#CC0000]" />
              {text}
            </span>
          ))}
        </div>
      </div>

      {/* ── Stats Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-[#111] mb-8">
        {[
          { label: 'Due Today', value: dueItems.length, icon: <CheckCircle size={20} strokeWidth={1.5} /> },
          { label: 'Critical', value: criticalCount, icon: <AlertTriangle size={20} strokeWidth={1.5} />, accent: criticalCount > 0 },
          { label: 'Avg. EF', value: dueItems.length > 0 ? (dueItems.reduce((s, i) => s + i.easinessFactor, 0) / dueItems.length).toFixed(2) : '—', icon: <Flame size={20} strokeWidth={1.5} /> },
          { label: 'Due Items', value: dueItems.length, icon: <ArrowRight size={20} strokeWidth={1.5} /> },
        ].map(({ label, value, icon, accent }, i) => (
          <div key={i} className="border-r border-b border-[#111] p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#737373]">{icon}</span>
              <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">{label}</span>
            </div>
            <div className={`font-display text-3xl lg:text-4xl font-black ${accent ? 'text-[#CC0000]' : 'text-[#111]'}`}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Grid: 8/4 split ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">

        {/* Left: Due Problems (8 cols) */}
        <div className="lg:col-span-8 lg:border-r border-[#111]">
          <div className="border-b-4 border-[#111] pb-2 mb-0 px-0 lg:pr-6">
            <h2 className="font-display text-3xl lg:text-4xl font-black text-[#111]">
              Due for Review
            </h2>
            <p className="font-body text-sm text-[#737373] mt-1">
              Problems scheduled for practice today
            </p>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <span className="font-data text-xs uppercase tracking-widest text-[#737373]">Loading...</span>
            </div>
          ) : dueItems.length === 0 ? (
            <div className="py-16 text-center">
              <div className="font-display text-2xl text-[#A3A3A3] tracking-[1em] mb-4">✦ ✦ ✦</div>
              <h3 className="font-display text-2xl font-bold text-[#111] mb-2">All Caught Up</h3>
              <p className="font-body text-sm text-[#737373]">No problems due for review. Use the search to report a solved problem.</p>
            </div>
          ) : (
            <div className="border-t border-[#111]">
              {dueItems.map((item, i) => (
                <button
                  key={item.progressId}
                  onClick={() => navigate(`/review/${item.problem.slug}`)}
                  className={`
                    w-full text-left flex items-center gap-4 px-4 lg:pr-6 py-4
                    hover:bg-[#F5F5F5] transition-colors cursor-pointer
                    ${i < dueItems.length - 1 ? 'border-b border-[#E5E5E0]' : ''}
                  `}
                >
                  {/* Index */}
                  <span className="font-data text-xs text-[#A3A3A3] w-6 text-right">{i + 1}.</span>

                  {/* Problem info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg font-bold truncate">{item.problem.title}</div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={item.problem.difficulty} />
                      {item.problem.topicTags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="muted">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* SM-2 stats */}
                  <div className="hidden md:flex items-center gap-4 text-right">
                    <div>
                      <div className="font-data text-[10px] uppercase tracking-widest text-[#737373]">EF</div>
                      <div className={`font-data text-sm font-semibold ${item.easinessFactor < 1.8 ? 'text-[#CC0000]' : 'text-[#111]'}`}>
                        {item.easinessFactor.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Int.</div>
                      <div className="font-data text-sm font-semibold">{item.intervalDays}d</div>
                    </div>
                    <div>
                      <div className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Reps</div>
                      <div className="font-data text-sm font-semibold">{item.repetitions}</div>
                    </div>
                  </div>

                  <ArrowRight size={16} strokeWidth={1.5} className="text-[#A3A3A3]" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar (4 cols) */}
        <div className="lg:col-span-4 lg:pl-6 mt-8 lg:mt-0">
          {/* Search */}
          <div className="mb-8">
            <h3 className="font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] mb-3">
              Report a Problem
            </h3>
            <SearchCombobox />
            <p className="font-body text-xs text-[#A3A3A3] mt-2 italic">
              Search by title or slug to report a solved problem
            </p>
          </div>

          {/* Sync LeetCode */}
          <Card className="mb-6">
            <h3 className="font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] mb-3">
              LeetCode Sync
            </h3>
            <p className="font-body text-sm text-[#525252] mb-4">
              Pull today's accepted submissions from LeetCode and auto-track new problems.
            </p>
            <Button
              variant="secondary"
              fullWidth
              onClick={handleSync}
              disabled={syncing}
            >
              <RefreshCw size={14} strokeWidth={1.5} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync LeetCode'}
            </Button>
          </Card>

          {/* Sync result */}
          {syncResult && (
            <Card className="border-l-4 border-l-[#CC0000]">
              <h4 className="font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] mb-2">
                Sync Result
              </h4>
              <p className="font-body text-sm text-[#111] mb-3">{syncResult.message}</p>
              {syncResult.data.newlyTracked.length > 0 && (
                <div className="space-y-1">
                  <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">Newly Tracked:</span>
                  {syncResult.data.newlyTracked.map(p => (
                    <div key={p.problemId} className="font-body text-sm">{p.title}</div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
