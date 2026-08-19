import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Play,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { api } from '../lib/api';
import { DifficultyBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

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
      .then((res) => setItems(res.data.items))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load problems'))
      .finally(() => setLoading(false));
  }, []);

  const allTopicTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((i) => i.problem.topicTags.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const now = new Date();
    return items
      .filter((item) => {
        if (
          search &&
          !item.problem.title.toLowerCase().includes(search.toLowerCase()) &&
          !item.problem.slug.toLowerCase().includes(search.toLowerCase())
        ) {
          return false;
        }
        if (difficulty !== 'all' && item.problem.difficulty.toUpperCase() !== difficulty.toUpperCase()) {
          return false;
        }
        if (topicTag !== 'all' && !item.problem.topicTags.includes(topicTag)) {
          return false;
        }
        if (dueFilter === 'overdue' && new Date(item.dueDate) > now) {
          return false;
        }
        if (dueFilter === 'upcoming' && new Date(item.dueDate) <= now) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let aVal: string | number, bVal: string | number;
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
        return aVal < bVal ? (sortDir === 'asc' ? -1 : 1) : aVal > bVal ? (sortDir === 'asc' ? 1 : -1) : 0;
      });
  }, [items, search, difficulty, dueFilter, topicTag, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  }

  function resetFilters() {
    setSearch('');
    setDifficulty('all');
    setDueFilter('all');
    setTopicTag('all');
    setSortKey('dueDate');
    setSortDir('asc');
    setPage(1);
  }

  const SortIndicator = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) {
      return <ArrowUpDown size={12} className="text-[#525866] ml-1 opacity-50" />;
    }
    return sortDir === 'asc' ? (
      <ArrowUp size={12} className="inline ml-1 text-[#bdc2ff]" />
    ) : (
      <ArrowDown size={12} className="inline ml-1 text-[#bdc2ff]" />
    );
  };

  const selectStyle =
    'bg-[#020203] border border-white/[0.08] rounded px-3 py-2 text-[#F3F4F6] font-mono text-xs focus:outline-none focus:border-[rgba(94,106,210,0.5)] cursor-pointer';

  const hasFilters = search || difficulty !== 'all' || dueFilter !== 'all' || topicTag !== 'all';

  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.08] pb-4 mb-6">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#F3F4F6] mb-2">
            Problem Catalog
          </h1>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#201f22] border border-white/[0.08] font-mono text-[10px] text-[#8A8F98] uppercase">
              SRS State: Active
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#121217] border border-[rgba(94,106,210,0.3)] font-mono text-[10px] text-[#bdc2ff]">
              {filtered.length}/{items.length} tracked
            </span>
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="self-start md:self-auto bg-[#5e6ad2] text-[#fdfaff] font-mono text-[11px] font-medium uppercase tracking-[0.04em] px-4 py-2 rounded border-t border-white/20 hover:bg-[#4854bb] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
        >
          <Play size={13} fill="currentColor" />
          <span>Review Now</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#050506] border border-white/[0.08] rounded-lg p-3.5 mb-6 flex flex-col xl:flex-row gap-3 items-center noise-bg">
        {/* Search */}
        <div className="relative w-full xl:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525866]" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search problems or topics..."
            className="w-full bg-[#020203] border border-white/[0.08] rounded pl-9 pr-3 py-2 text-[#F3F4F6] font-mono text-xs focus:outline-none focus:border-[rgba(94,106,210,0.5)] placeholder:text-[#525866]"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto items-center">
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setPage(1);
            }}
            className={selectStyle}
          >
            <option value="all">Difficulty: All</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          <select
            value={dueFilter}
            onChange={(e) => {
              setDueFilter(e.target.value as DueFilter);
              setPage(1);
            }}
            className={selectStyle}
          >
            <option value="all">Status: All</option>
            <option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option>
          </select>

          <select
            value={topicTag}
            onChange={(e) => {
              setTopicTag(e.target.value);
              setPage(1);
            }}
            className={`${selectStyle} max-w-[160px] truncate`}
          >
            <option value="all">Topic: All</option>
            {allTopicTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>

          {hasFilters && (
            <button
              onClick={resetFilters}
              className="font-mono text-[11px] text-[#FF375F] hover:underline px-2 py-1 cursor-pointer"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <div className="py-16 text-center font-mono text-xs text-[#8A8F98]">
          Loading problem catalog...
        </div>
      ) : error ? (
        <div className="p-4 rounded bg-[#FF375F]/10 border border-[#FF375F]/30 text-[#FF375F] font-mono text-xs">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-[#050506] border border-white/[0.08] rounded-lg p-8 noise-bg">
          <p className="font-mono text-sm text-[#8A8F98]">No problems match the specified criteria.</p>
          <button
            onClick={resetFilters}
            className="mt-2 font-mono text-xs text-[#bdc2ff] hover:underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Data Table */}
          <div className="hidden md:block w-full border border-white/[0.08] rounded-lg bg-[#050506] overflow-hidden noise-bg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-[#0A0A0C] border-b border-white/[0.08]">
                  <tr>
                    <th
                      onClick={() => toggleSort('title')}
                      className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider cursor-pointer hover:text-[#F3F4F6] transition-colors w-2/5"
                    >
                      <div className="flex items-center gap-1">
                        <span>PROBLEM</span>
                        <SortIndicator col="title" />
                      </div>
                    </th>
                    <th className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider">
                      DIFFICULTY
                    </th>
                    <th
                      onClick={() => toggleSort('easinessFactor')}
                      className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider cursor-pointer hover:text-[#F3F4F6] transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>EF</span>
                        <SortIndicator col="easinessFactor" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('intervalDays')}
                      className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider cursor-pointer hover:text-[#F3F4F6] transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>INTERVAL</span>
                        <SortIndicator col="intervalDays" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('repetitions')}
                      className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider cursor-pointer hover:text-[#F3F4F6] transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>REPS</span>
                        <SortIndicator col="repetitions" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('dueDate')}
                      className="p-3.5 font-mono text-[11px] text-[#525866] uppercase tracking-wider cursor-pointer hover:text-[#F3F4F6] transition-colors text-right"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>NEXT DUE</span>
                        <SortIndicator col="dueDate" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="font-mono text-xs text-[#8A8F98]">
                  {pageItems.map((item) => {
                    const isOverdue = new Date(item.dueDate).getTime() <= Date.now();
                    return (
                      <tr
                        key={item.progressId}
                        onClick={() => navigate(`/review/${item.problem.slug}`)}
                        className={`border-b border-white/[0.04] transition-colors cursor-pointer group ${
                          isOverdue
                            ? 'bg-[#FF375F]/[0.03] hover:bg-[#FF375F]/[0.08]'
                            : 'hover:bg-[#121217]'
                        }`}
                      >
                        <td className={`p-3.5 ${isOverdue ? 'border-l-2 border-[#FF375F]' : 'border-l-2 border-transparent'}`}>
                          <div className="flex flex-col">
                            <span className="font-medium text-[#F3F4F6] group-hover:text-[#bdc2ff] transition-colors">
                              {item.problem.title}
                            </span>
                            <span className="font-mono text-[10px] text-[#525866] mt-0.5">
                              {item.problem.topicTags.slice(0, 3).join(', ')}
                            </span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <DifficultyBadge difficulty={item.problem.difficulty} />
                        </td>
                        <td
                          className={`p-3.5 text-right font-mono ${
                            item.easinessFactor < 1.8 ? 'text-[#FF375F]' : 'text-[#F3F4F6]'
                          }`}
                        >
                          {item.easinessFactor.toFixed(2)}
                        </td>
                        <td className="p-3.5 text-right font-mono text-[#F3F4F6]">
                          {item.intervalDays}d
                        </td>
                        <td className="p-3.5 text-right font-mono text-[#525866]">
                          {item.repetitions}
                        </td>
                        <td className="p-3.5 text-right font-mono">
                          <span className={isOverdue ? 'text-[#FF375F]' : 'text-[#8A8F98]'}>
                            {new Date(item.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card List View */}
          <div className="md:hidden space-y-2.5">
            {pageItems.map((item) => {
              const isOverdue = new Date(item.dueDate).getTime() <= Date.now();
              return (
                <div
                  key={item.progressId}
                  onClick={() => navigate(`/review/${item.problem.slug}`)}
                  className={`p-4 rounded-lg border border-white/[0.08] bg-[#050506] cursor-pointer transition-colors ${
                    isOverdue ? 'border-l-4 border-l-[#FF375F]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline text-sm font-semibold text-[#F3F4F6]">
                      {item.problem.title}
                    </h3>
                    <ArrowRight size={14} className="text-[#525866]" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <DifficultyBadge difficulty={item.problem.difficulty} />
                    <span className="font-mono text-[10px] text-[#525866]">
                      EF: {item.easinessFactor.toFixed(2)} · {item.intervalDays}d
                    </span>
                  </div>
                  <div className="font-mono text-[10px] text-[#8A8F98]">
                    Due:{' '}
                    <span className={isOverdue ? 'text-[#FF375F]' : 'text-[#F3F4F6]'}>
                      {new Date(item.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 font-mono text-xs text-[#525866]">
              <span>
                Page {page} of {totalPages} ({filtered.length} total)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5"
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5"
                >
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
