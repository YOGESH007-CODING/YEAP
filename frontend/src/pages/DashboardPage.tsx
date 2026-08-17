import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, Flame, CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge, DifficultyBadge } from '../components/ui/Badge';
import { SearchCombobox } from '../components/SearchCombobox';
import { TopicHeatmap, type TopicMastery } from '../components/dashboard/TopicHeatmap';
import { StreakCard, type StreakData } from '../components/dashboard/StreakCard';

interface Problem { id: string; slug: string; title: string; difficulty: string; topicTags: string[]; companyTags: string[] }
interface DueItem { progressId: string; problem: Problem; easinessFactor: number; intervalDays: number; repetitions: number; dueDate: string; lastReviewedAt: string | null }
interface DueResponse { success: boolean; data: { count: number; totalTracked?: number; items: DueItem[]; bonusQuestions: Problem[] } }
interface SyncResponse { success: boolean; message: string; data: { newlyTracked: { problemId: string; title: string }[] } }
interface HeatmapResponse { success: boolean; data: { topics: TopicMastery[] } }
interface StreakResponse { success: boolean; data: StreakData }

export function DashboardPage() {
  const [dueItems, setDueItems] = useState<DueItem[]>([]);
  const [bonusQuestions, setBonusQuestions] = useState<Problem[]>([]);
  const [totalTracked, setTotalTracked] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicMastery[]>([]);
  const [heatmapLoading, setHeatmapLoading] = useState(true);
  const [streak, setStreak] = useState<StreakResponse['data'] | null>(null);
  const navigate = useNavigate();

  useEffect(() => { void loadDue(); void loadHeatmap(); void loadStreak(); }, []);
  async function loadHeatmap() { try { const res = await api.get<HeatmapResponse>('/api/trackers/topics/heatmap'); setTopics(res.data.topics); } catch { /* no memory data yet */ } finally { setHeatmapLoading(false); } }
  async function loadStreak() { try { const res = await api.get<StreakResponse>('/api/streak'); setStreak(res.data); } catch { /* streak is supplementary */ } }
  async function loadDue(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await api.get<DueResponse>('/api/review/due');
      const items = res.data.items ?? [];
      setDueItems(items);
      // Older backend deployments do not yet include bonusQuestions. Keep the
      // dashboard functional while those instances are being rolled out.
      setBonusQuestions(res.data.bonusQuestions ?? []);
      setTotalTracked(res.data.totalTracked ?? items.length);
    }
    catch (error) { console.error('Failed to load due items:', error); }
    finally { if (showLoading) setLoading(false); }
  }
  async function handleSync() {
    setSyncing(true); setSyncResult(null); setSyncError(null);
    try { const res = await api.post<SyncResponse>('/api/review/sync'); setSyncResult(res); await loadDue(false); }
    catch (error) { setSyncError(error instanceof Error ? error.message : 'Unable to sync LeetCode. Please try again.'); }
    finally { setSyncing(false); }
  }
  const factors = dueItems.map((item) => Number(item.easinessFactor)).filter(Number.isFinite);
  const criticalCount = factors.filter((factor) => factor < 1.8).length;
  const avgEF = factors.length ? (factors.reduce((sum, factor) => sum + factor, 0) / factors.length).toFixed(2) : '—';

  return <div className="mx-auto max-w-screen-xl px-4 py-8">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {[{ label: 'Due Today', value: dueItems.length, icon: <CheckCircle size={16} />, accent: false }, { label: 'Critical', value: criticalCount, icon: <AlertTriangle size={16} />, accent: criticalCount > 0 }, { label: 'Avg EF', value: avgEF, icon: <Flame size={16} />, accent: false }, { label: 'Queue', value: totalTracked, icon: <ArrowRight size={16} />, accent: false }].map(({ label, value, icon, accent }) => <Card key={label} className="p-5"><div className="flex items-center gap-2 mb-2"><span className="text-[#8A8F98]">{icon}</span><span className="font-mono text-[10px] uppercase tracking-widest text-[#8A8F98]">{label}</span></div><div className={`text-3xl font-semibold tracking-tight ${accent ? 'text-red-400' : 'text-[#EDEDEF]'}`}>{value}</div></Card>)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-8">
        <div className="flex items-baseline justify-between mb-4"><div><h2 className="text-2xl font-semibold tracking-tight text-[#EDEDEF]">Due for Review</h2><p className="text-sm text-[#8A8F98] mt-0.5">Problems scheduled for practice today</p></div><Badge variant="accent">{dueItems.length} due</Badge></div>
        {loading ? <div className="py-16 text-center text-sm text-[#8A8F98]">Loading...</div> : dueItems.length === 0 ? <Card className="py-12 text-center"><p className="text-lg font-semibold text-[#EDEDEF] mb-1">All Caught Up</p><p className="text-sm text-[#8A8F98]">Try a bonus FAANG question below.</p></Card> : <div className="space-y-2">{dueItems.map((item) => <ReviewCard key={item.progressId} item={item} onClick={() => navigate(`/review/${item.problem.slug}`)} />)}</div>}
        {bonusQuestions.length > 0 && <section className="mt-8"><div className="mb-4"><div className="flex items-center gap-2"><Sparkles size={16} className="text-[#8B94E5]" /><h2 className="text-xl font-semibold text-[#EDEDEF]">Bonus FAANG Questions</h2></div><p className="text-sm text-[#8A8F98] mt-1">You have fewer than 5 reviews today, so here are {bonusQuestions.length} fresh questions from Google, Amazon, Apple, Meta, and Netflix.</p></div><div className="space-y-2">{bonusQuestions.map((problem) => <Card key={problem.id} hoverable onClick={() => navigate(`/review/${problem.slug}`)} className="flex items-center gap-4 px-5 py-4 border-[#5E6AD2]/30"><div className="w-8 h-8 rounded-lg bg-[#5E6AD2]/15 text-[#8B94E5] flex items-center justify-center shrink-0"><Sparkles size={15} /></div><div className="flex-1 min-w-0"><div className="text-sm font-medium text-[#EDEDEF] truncate">{problem.title}</div><div className="flex flex-wrap items-center gap-1.5 mt-1.5"><Badge variant="accent">Bonus</Badge><DifficultyBadge difficulty={problem.difficulty} />{problem.companyTags.slice(0, 2).map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}</div></div><ArrowRight size={14} className="text-white/20" /></Card>)}</div></section>}
      </div>
      <div className="lg:col-span-4 space-y-4"><div><h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">Report a Problem</h3><SearchCombobox /><p className="text-[11px] text-white/30 mt-1.5">Search by title or slug</p></div>{streak && <StreakCard streak={streak} />}<TopicHeatmap topics={topics} loading={heatmapLoading} /><Card className="p-5"><h3 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">LeetCode Sync</h3><p className="text-sm text-[#8A8F98] mb-4">Pull today’s accepted submissions from LeetCode.</p><Button variant="secondary" fullWidth onClick={handleSync} disabled={syncing}><RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />{syncing ? 'Syncing...' : 'Sync LeetCode'}</Button></Card>{syncError && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{syncError}</div>}{syncResult && <Card accent className="p-5"><h4 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-2">Sync Result</h4><p className="text-sm text-[#EDEDEF] mb-2">{syncResult.message}</p>{syncResult.data.newlyTracked.length > 0 && <div className="space-y-0.5"><span className="font-mono text-[10px] text-white/30">Newly Tracked:</span>{syncResult.data.newlyTracked.map((problem) => <div key={problem.problemId} className="text-sm text-[#EDEDEF]">{problem.title}</div>)}</div>}</Card>}</div>
    </div>
  </div>;
}

function ReviewCard({ item, onClick }: { item: DueItem; onClick: () => void }) {
  return <Card hoverable onClick={onClick} className="flex items-center gap-4 px-5 py-4"><div className="flex-1 min-w-0"><div className="text-sm font-medium text-[#EDEDEF] truncate">{item.problem.title}</div><div className="flex flex-wrap items-center gap-1.5 mt-1.5"><DifficultyBadge difficulty={item.problem.difficulty} />{item.problem.topicTags.slice(0, 2).map((tag) => <Badge key={tag} variant="muted">{tag}</Badge>)}</div></div><div className="hidden md:flex items-center gap-5 text-right shrink-0"><div><div className="font-mono text-[10px] uppercase tracking-widest text-white/30">EF</div><div className={`font-mono text-sm font-medium ${item.easinessFactor < 1.8 ? 'text-red-400' : 'text-[#EDEDEF]'}`}>{item.easinessFactor.toFixed(2)}</div></div><div><div className="font-mono text-[10px] uppercase tracking-widest text-white/30">Int</div><div className="font-mono text-sm font-medium text-[#EDEDEF]">{item.intervalDays}d</div></div><div><div className="font-mono text-[10px] uppercase tracking-widest text-white/30">Reps</div><div className="font-mono text-sm font-medium text-[#EDEDEF]">{item.repetitions}</div></div></div><ArrowRight size={14} className="text-white/20 shrink-0" /></Card>;
}
