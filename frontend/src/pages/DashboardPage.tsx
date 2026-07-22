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
  problem: { id: string; slug: string; title: string; difficulty: string; topicTags: string[]; companyTags: string[] };
  easinessFactor: number;
  intervalDays: number;
  repetitions: number;
  dueDate: string;
  lastReviewedAt: string | null;
}

interface DueResponse { success: boolean; data: { count: number; items: DueItem[] } }

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
  const navigate = useNavigate();

  useEffect(() => { loadDue(); }, []);

  async function loadDue() {
    setLoading(true);
    try { const res = await api.get<DueResponse>('/api/review/due'); setDueItems(res.data.items); }
    catch (e) { console.error('Failed to load due items:', e); }
    finally { setLoading(false); }
  }

  async function handleSync() {
    setSyncing(true); setSyncResult(null);
    try { const res = await api.post<SyncResponse>('/api/review/sync'); setSyncResult(res); loadDue(); }
    catch (e) { console.error('Sync failed:', e); }
    finally { setSyncing(false); }
  }

  const criticalCount = dueItems.filter(i => i.easinessFactor < 1.8).length;
  const avgEF = dueItems.length > 0 ? (dueItems.reduce((s, i) => s + i.easinessFactor, 0) / dueItems.length).toFixed(2) : '—';

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* ── Stats ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Due Today', value: dueItems.length, icon: <CheckCircle size={16} />, accent: false },
          { label: 'Critical', value: criticalCount, icon: <AlertTriangle size={16} />, accent: criticalCount > 0 },
          { label: 'Avg EF', value: avgEF, icon: <Flame size={16} />, accent: false },
          { label: 'Queue', value: dueItems.length, icon: <ArrowRight size={16} />, accent: false },
        ].map(({ label, value, icon, accent }, i) => (
          <Card key={i} className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[#8A8F98]">{icon}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#8A8F98]">{label}</span>
            </div>
            <div className={`text-3xl font-semibold tracking-tight ${accent ? 'text-red-400' : 'text-[#EDEDEF]'}`}>{value}</div>
          </Card>
        ))}
      </div>

      {/* ── Main Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Due list */}
        <div className="lg:col-span-8">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">
                Due for Review
              </h2>
              <p className="text-sm text-[#8A8F98] mt-0.5">Problems scheduled for practice today</p>
            </div>
            <Badge variant="accent">{dueItems.length} due</Badge>
          </div>

          {loading ? (
            <div className="py-16 text-center text-sm text-[#8A8F98]">Loading...</div>
          ) : dueItems.length === 0 ? (
            <Card className="py-16 text-center">
              <p className="text-lg font-semibold text-[#EDEDEF] mb-1">All Caught Up</p>
              <p className="text-sm text-[#8A8F98]">No problems due. Use search to report a solved problem.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {dueItems.map((item) => (
                <Card
                  key={item.progressId}
                  hoverable
                  onClick={() => navigate(`/review/${item.problem.slug}`)}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-[#EDEDEF] truncate">{item.problem.title}</div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <DifficultyBadge difficulty={item.problem.difficulty} />
                      {item.problem.topicTags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="muted">{tag}</Badge>
                      ))}
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-5 text-right shrink-0">
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/30">EF</div>
                      <div className={`font-mono text-sm font-medium ${item.easinessFactor < 1.8 ? 'text-red-400' : 'text-[#EDEDEF]'}`}>
                        {item.easinessFactor.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/30">Int</div>
                      <div className="font-mono text-sm font-medium text-[#EDEDEF]">{item.intervalDays}d</div>
                    </div>
                    <div>
                      <div className="font-mono text-[10px] uppercase tracking-widest text-white/30">Reps</div>
                      <div className="font-mono text-sm font-medium text-[#EDEDEF]">{item.repetitions}</div>
                    </div>
                  </div>

                  <ArrowRight size={14} className="text-white/20 shrink-0" />
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="lg:col-span-4 space-y-4">
          <div>
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">Report a Problem</h3>
            <SearchCombobox />
            <p className="text-[11px] text-white/30 mt-1.5">Search by title or slug</p>
          </div>

          <Card className="p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">LeetCode Sync</h3>
            <p className="text-sm text-[#8A8F98] mb-4">Pull today's accepted submissions from LeetCode.</p>
            <Button variant="secondary" fullWidth onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync LeetCode'}
            </Button>
          </Card>

          {syncResult && (
            <Card accent className="p-5">
              <h4 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">Sync Result</h4>
              <p className="text-sm text-[#EDEDEF] mb-2">{syncResult.message}</p>
              {syncResult.data.newlyTracked.length > 0 && (
                <div className="space-y-0.5">
                  <span className="font-mono text-[10px] text-white/30">Newly Tracked:</span>
                  {syncResult.data.newlyTracked.map(p => (
                    <div key={p.problemId} className="text-sm text-[#EDEDEF]">{p.title}</div>
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
