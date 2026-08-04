import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { DifficultyBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface HistoryItem {
  progressId: string;
  problem: { id: string; slug: string; title: string; difficulty: string; topicTags: string[]; companyTags: string[] };
  easinessFactor: number; intervalDays: number; repetitions: number; dueDate: string; lastReviewedAt: string | null;
}
interface HistoryResponse { success: boolean; data: { count: number; items: HistoryItem[] } }

type SortKey = 'title' | 'easinessFactor' | 'intervalDays' | 'repetitions' | 'dueDate';
type SortDir = 'asc' | 'desc';
type DueFilter = 'all' | 'overdue' | 'upcoming';
const PAGE_SIZE = 50;

export function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [topicTag, setTopicTag] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    api.get<HistoryResponse>('/api/review/history')
      .then(res => setItems(res.data.items))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const allTopicTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(i => i.problem.topicTags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const now = new Date();
    return items
      .filter(item => {
        if (search && !item.problem.title.toLowerCase().includes(search.toLowerCase()) && !item.problem.slug.toLowerCase().includes(search.toLowerCase())) return false;
        if (difficulty !== 'all' && item.problem.difficulty !== difficulty) return false;
        if (topicTag !== 'all' && !item.problem.topicTags.includes(topicTag)) return false;
        if (dueFilter === 'overdue' && new Date(item.dueDate) > now) return false;
        if (dueFilter === 'upcoming' && new Date(item.dueDate) <= now) return false;
        return true;
      })
      .sort((a, b) => {
        let aVal: string | number, bVal: string | number;
        if (sortKey === 'title') { aVal = a.problem.title.toLowerCase(); bVal = b.problem.title.toLowerCase(); }
        else if (sortKey === 'dueDate') { aVal = new Date(a.dueDate).getTime(); bVal = new Date(b.dueDate).getTime(); }
        else { aVal = a[sortKey]; bVal = b[sortKey]; }
        return aVal < bVal ? (sortDir === 'asc' ? -1 : 1) : aVal > bVal ? (sortDir === 'asc' ? 1 : -1) : 0;
      });
  }, [items, search, difficulty, dueFilter, topicTag, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  }

  function resetFilters() {
    setSearch(''); setDifficulty('all'); setDueFilter('all'); setTopicTag('all');
    setSortKey('dueDate'); setSortDir('asc'); setPage(1);
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-white/10 ml-1">↕</span>;
    return sortDir === 'asc' ? <ArrowUp size={10} className="inline ml-1 text-[#5E6AD2]" /> : <ArrowDown size={10} className="inline ml-1 text-[#5E6AD2]" />;
  };

  const selectCls = "font-mono w-full bg-[#0F0F12] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#EDEDEF] focus:border-[#5E6AD2] focus:outline-none appearance-none cursor-pointer";
  const hasFilters = search || difficulty !== 'all' || dueFilter !== 'all' || topicTag !== 'all';

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">History</h1>
          <p className="text-sm text-[#8A8F98] mt-0.5">All tracked problems and SRS state</p>
        </div>
        <span className="font-mono text-xs text-[#8A8F98]">{filtered.length}/{items.length}</span>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-1">Search</label>
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Title or slug..." className={selectCls} />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-1">Difficulty</label>
            <select value={difficulty} onChange={e => { setDifficulty(e.target.value); setPage(1); }} className={selectCls}>
              <option value="all">All</option><option value="EASY">Easy</option><option value="MEDIUM">Medium</option><option value="HARD">Hard</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-1">Due Status</label>
            <select value={dueFilter} onChange={e => { setDueFilter(e.target.value as DueFilter); setPage(1); }} className={selectCls}>
              <option value="all">All</option><option value="overdue">Overdue</option><option value="upcoming">Upcoming</option>
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-white/30 block mb-1">Topic</label>
            <select value={topicTag} onChange={e => { setTopicTag(e.target.value); setPage(1); }} className={selectCls}>
              <option value="all">All Topics</option>
              {allTopicTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            {hasFilters && (
              <button onClick={resetFilters} className="font-mono text-[10px] uppercase tracking-widest text-red-400 hover:underline cursor-pointer">Clear</button>
            )}
          </div>
        </div>
      </Card>

      {/* Table / List */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[#8A8F98]">Loading...</div>
      ) : error ? (
        <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-4"><p className="text-sm text-red-400">{error}</p></div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <p className="text-sm text-[#8A8F98]">No problems match your filters.</p>
          <button onClick={resetFilters} className="font-mono text-[10px] text-[#5E6AD2] hover:underline mt-2 cursor-pointer">Clear filters</button>
        </Card>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-white/[0.03]">
                  {([['title','Problem'],[null,'Diff'],['easinessFactor','EF'],['intervalDays','Int'],['repetitions','Reps'],['dueDate','Due']] as [SortKey|null,string][]).map(([col,label],i) => (
                    <th key={i} className={`text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-white/30 border-b border-white/[0.06] ${col ? 'cursor-pointer hover:text-white/50 select-none' : ''}`}
                        onClick={col ? () => toggleSort(col) : undefined}>
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                  <th className="px-4 py-3 border-b border-white/[0.06]" />
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const overdue = new Date(item.dueDate).getTime() <= Date.now();
                  return (
                    <tr key={item.progressId} className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
                        onClick={() => navigate(`/review/${item.problem.slug}`)}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-[#EDEDEF]">{item.problem.title}</div>
                        <div className="font-mono text-[10px] text-white/20 mt-0.5">{item.problem.topicTags.slice(0,3).join(' · ')}</div>
                      </td>
                      <td className="px-4 py-3"><DifficultyBadge difficulty={item.problem.difficulty} /></td>
                      <td className={`px-4 py-3 font-mono text-sm ${item.easinessFactor < 1.8 ? 'text-red-400' : 'text-[#EDEDEF]'}`}>{item.easinessFactor.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-sm text-[#EDEDEF]">{item.intervalDays}d</td>
                      <td className="px-4 py-3 font-mono text-sm text-[#EDEDEF]">{item.repetitions}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono text-xs ${overdue ? 'text-red-400' : 'text-[#8A8F98]'}`}>
                          {overdue ? '⚠ ' : ''}{new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right"><ArrowRight size={12} className="text-white/15" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="md:hidden space-y-2">
            {pageItems.map(item => {
              const overdue = new Date(item.dueDate).getTime() <= Date.now();
              return (
                <Card key={item.progressId} hoverable onClick={() => navigate(`/review/${item.problem.slug}`)} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#EDEDEF] truncate">{item.problem.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <DifficultyBadge difficulty={item.problem.difficulty} />
                      <span className="font-mono text-[10px] text-white/30">EF {item.easinessFactor.toFixed(2)} · {item.intervalDays}d</span>
                      <span className={`font-mono text-[10px] ${overdue ? 'text-red-400' : 'text-white/30'}`}>{overdue ? '⚠ Overdue' : ''}</span>
                    </div>
                  </div>
                  <ArrowRight size={12} className="text-white/15 shrink-0" />
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="font-mono text-xs text-white/30">Page {page}/{totalPages} · {filtered.length} results</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1">
                  <ChevronLeft size={14} />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`font-mono text-xs px-2.5 py-1 rounded-lg cursor-pointer transition-colors ${page === p ? 'bg-[#5E6AD2] text-white' : 'text-[#8A8F98] hover:bg-white/[0.05]'}`}>
                      {p}
                    </button>
                  );
                })}
                <Button variant="ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
