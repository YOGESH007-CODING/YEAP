import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, ArrowDown, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { DifficultyBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryItem {
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

interface HistoryResponse {
  success: boolean;
  data: { count: number; items: HistoryItem[] };
}

type SortKey = 'title' | 'easinessFactor' | 'intervalDays' | 'repetitions' | 'dueDate';
type SortDir = 'asc' | 'desc';
type DueFilter = 'all' | 'overdue' | 'upcoming';

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (all client-side — no extra endpoints needed)
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [topicTag, setTopicTag] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);

  // Fetch all history once — no polling, no query params
  useEffect(() => {
    api.get<HistoryResponse>('/api/review/history')
      .then(res => setItems(res.data.items))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load history'))
      .finally(() => setLoading(false));
  }, []);

  // Derive unique topic tags from all items (standard library, no dependency)
  const allTopicTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.problem.topicTags.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const now = useMemo(() => new Date(), []);

  // Filter + sort entirely in JS — zero extra network requests
  const filtered = useMemo(() => {
    return items
      .filter(item => {
        if (search && !item.problem.title.toLowerCase().includes(search.toLowerCase()) &&
            !item.problem.slug.toLowerCase().includes(search.toLowerCase())) return false;
        if (difficulty !== 'all' && item.problem.difficulty !== difficulty) return false;
        if (topicTag !== 'all' && !item.problem.topicTags.includes(topicTag)) return false;
        if (dueFilter === 'overdue' && new Date(item.dueDate) > now) return false;
        if (dueFilter === 'upcoming' && new Date(item.dueDate) <= now) return false;
        return true;
      })
      .sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;
        if (sortKey === 'title') {
          aVal = a.problem.title.toLowerCase();
          bVal = b.problem.title.toLowerCase();
        } else if (sortKey === 'dueDate') {
          aVal = new Date(a.dueDate).getTime();
          bVal = new Date(b.dueDate).getTime();
        } else {
          aVal = a[sortKey];
          bVal = b[sortKey];
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, search, difficulty, dueFilter, topicTag, sortKey, sortDir, now]);

  // Pagination — simple slice, no library
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function resetFilters() {
    setSearch(''); setDifficulty('all'); setDueFilter('all');
    setTopicTag('all'); setSortKey('dueDate'); setSortDir('asc'); setPage(1);
  }

  // SortIcon — rendered inline, no component needed
  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <span className="text-[#E5E5E0] ml-1">↕</span>;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="inline ml-1 text-[#111]" />
      : <ArrowDown size={12} className="inline ml-1 text-[#111]" />;
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Header */}
      <div className="border-b-4 border-[#111] pb-4 mb-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-3xl lg:text-5xl font-black text-[#111]">History</h1>
            <p className="font-body text-sm text-[#737373] mt-1">All tracked problems and their SRS state</p>
          </div>
          <div className="font-data text-sm font-semibold text-[#111]">
            {filtered.length}
            <span className="text-[#737373] font-normal"> / {items.length} problems</span>
          </div>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#111] mb-6">

        {/* Search */}
        <div className="border-b border-[#111] lg:border-b-0 lg:border-r p-3">
          <label className="font-data text-[10px] uppercase tracking-widest text-[#737373] block mb-1">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Title or slug..."
            className="font-data w-full bg-transparent text-sm border-b border-[#E5E5E0] pb-1 focus:outline-none focus:border-[#111] placeholder:text-[#A3A3A3] transition-colors"
          />
        </div>

        {/* Difficulty */}
        <div className="border-b border-[#111] lg:border-b-0 lg:border-r p-3">
          <label className="font-data text-[10px] uppercase tracking-widest text-[#737373] block mb-1">
            Difficulty
          </label>
          <select
            value={difficulty}
            onChange={e => { setDifficulty(e.target.value); setPage(1); }}
            className="font-data w-full bg-transparent text-sm border-b border-[#E5E5E0] pb-1 focus:outline-none cursor-pointer appearance-none"
          >
            <option value="all">All</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>

        {/* Due Status */}
        <div className="border-b border-[#111] lg:border-b-0 lg:border-r p-3">
          <label className="font-data text-[10px] uppercase tracking-widest text-[#737373] block mb-1">
            Due Status
          </label>
          <select
            value={dueFilter}
            onChange={e => { setDueFilter(e.target.value as DueFilter); setPage(1); }}
            className="font-data w-full bg-transparent text-sm border-b border-[#E5E5E0] pb-1 focus:outline-none cursor-pointer appearance-none"
          >
            <option value="all">All</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </div>

        {/* Topic Tag */}
        <div className="p-3 flex flex-col justify-between">
          <div>
            <label className="font-data text-[10px] uppercase tracking-widest text-[#737373] block mb-1">
              Topic Tag
            </label>
            <select
              value={topicTag}
              onChange={e => { setTopicTag(e.target.value); setPage(1); }}
              className="font-data w-full bg-transparent text-sm border-b border-[#E5E5E0] pb-1 focus:outline-none cursor-pointer appearance-none"
            >
              <option value="all">All Topics</option>
              {allTopicTags.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(search || difficulty !== 'all' || dueFilter !== 'all' || topicTag !== 'all') && (
            <button
              onClick={resetFilters}
              className="font-data text-[10px] uppercase tracking-widest text-[#CC0000] hover:underline decoration-[#CC0000] mt-2 text-left cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      {loading ? (
        <div className="py-16 text-center">
          <span className="font-data text-xs uppercase tracking-widest text-[#737373]">Loading...</span>
        </div>
      ) : error ? (
        <div className="border border-[#CC0000] bg-red-50 p-4">
          <p className="font-body text-sm text-[#CC0000]">{error}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="border-4 border-dashed border-[#E5E5E0] py-16 text-center">
          <div className="font-display text-2xl text-[#A3A3A3] tracking-[1em] mb-3">✦ ✦ ✦</div>
          <p className="font-body text-sm text-[#737373]">No problems match your filters.</p>
          <button onClick={resetFilters} className="font-data text-[10px] uppercase tracking-widest text-[#CC0000] hover:underline mt-2 cursor-pointer">
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block border border-[#111] overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#111] text-[#F9F9F7]">
                  {([
                    ['title', 'Problem'],
                    [null, 'Difficulty'],
                    ['easinessFactor', 'EF'],
                    ['intervalDays', 'Interval'],
                    ['repetitions', 'Reps'],
                    ['dueDate', 'Next Due'],
                  ] as [SortKey | null, string][]).map(([col, label], i) => (
                    <th
                      key={i}
                      className={`text-left px-4 py-3 font-data text-[10px] uppercase tracking-widest border-r border-[#333] last:border-r-0 ${col ? 'cursor-pointer hover:bg-[#222] select-none' : ''}`}
                      onClick={col ? () => toggleSort(col) : undefined}
                    >
                      {label}{col && <SortIcon col={col} />}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-data text-[10px] uppercase tracking-widest text-right"></th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item, i) => {
                  const isOverdue = new Date(item.dueDate) <= now;
                  return (
                    <tr
                      key={item.progressId}
                      className={`border-b border-[#E5E5E0] hover:bg-[#F5F5F5] transition-colors cursor-pointer ${i % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}
                      onClick={() => navigate(`/review/${item.problem.slug}`)}
                    >
                      <td className="px-4 py-3 border-r border-[#E5E5E0]">
                        <div className="font-display text-sm font-semibold">{item.problem.title}</div>
                        <div className="font-data text-[10px] text-[#A3A3A3] mt-0.5">
                          {item.problem.topicTags.slice(0, 3).join(' · ')}
                        </div>
                      </td>
                      <td className="px-4 py-3 border-r border-[#E5E5E0]">
                        <DifficultyBadge difficulty={item.problem.difficulty} />
                      </td>
                      <td className={`px-4 py-3 border-r border-[#E5E5E0] font-data text-sm ${item.easinessFactor < 1.8 ? 'text-[#CC0000] font-semibold' : ''}`}>
                        {item.easinessFactor.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E5E5E0] font-data text-sm">
                        {item.intervalDays}d
                      </td>
                      <td className="px-4 py-3 border-r border-[#E5E5E0] font-data text-sm">
                        {item.repetitions}
                      </td>
                      <td className="px-4 py-3 border-r border-[#E5E5E0]">
                        <span className={`font-data text-xs ${isOverdue ? 'text-[#CC0000] font-semibold' : 'text-[#111]'}`}>
                          {isOverdue ? '⚠ ' : ''}
                          {new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ArrowRight size={14} strokeWidth={1.5} className="text-[#A3A3A3]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden border-t border-[#111]">
            {pageItems.map((item) => {
              const isOverdue = new Date(item.dueDate) <= now;
              return (
                <button
                  key={item.progressId}
                  onClick={() => navigate(`/review/${item.problem.slug}`)}
                  className="w-full text-left border-b border-[#E5E5E0] px-4 py-4 hover:bg-[#F5F5F5] transition-colors cursor-pointer flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-base font-bold truncate">{item.problem.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <DifficultyBadge difficulty={item.problem.difficulty} />
                      <span className="font-data text-[10px] text-[#737373] uppercase tracking-widest">
                        EF {item.easinessFactor.toFixed(2)} · {item.intervalDays}d
                      </span>
                      <span className={`font-data text-[10px] uppercase tracking-widest ${isOverdue ? 'text-[#CC0000]' : 'text-[#737373]'}`}>
                        {isOverdue ? '⚠ Overdue' : 'Due ' + new Date(item.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight size={14} strokeWidth={1.5} className="text-[#A3A3A3] shrink-0" />
                </button>
              );
            })}
          </div>

          {/* ── Pagination ──────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border border-[#111] border-t-0 px-4 py-3">
              <span className="font-data text-xs text-[#737373] uppercase tracking-widest">
                Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} results
              </span>
              <div className="flex items-center gap-0">
                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 min-h-[36px]"
                >
                  <ChevronLeft size={14} strokeWidth={1.5} />
                </Button>
                {/* Show up to 5 page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`font-data text-xs px-3 py-2 min-h-[36px] min-w-[36px] border-l border-[#E5E5E0] cursor-pointer transition-colors
                        ${page === p ? 'bg-[#111] text-[#F9F9F7]' : 'hover:bg-[#F5F5F5]'}`}
                    >
                      {p}
                    </button>
                  );
                })}
                <Button
                  variant="ghost"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 min-h-[36px] border-l border-[#E5E5E0]"
                >
                  <ChevronRight size={14} strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
