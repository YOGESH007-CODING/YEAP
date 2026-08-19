import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { api } from '../lib/api';
import { DifficultyBadge } from './ui/Badge';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topicTags: string[];
}

interface SearchResponse {
  success: boolean;
  data: { problems: Problem[]; count: number };
}

export function SearchCombobox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Problem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = 'problem-search-results';
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length < 2) { setResults([]); setIsOpen(false); setActiveIndex(-1); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResponse>(`/api/problems/search?q=${encodeURIComponent(query)}&limit=8`, { signal: controller.signal });
        setResults(res.data.problems);
        setIsOpen(true);
        setActiveIndex(-1);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectProblem = (problem: Problem) => {
    navigate(`/review/${problem.slug}`);
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && isOpen && activeIndex >= 0) {
      event.preventDefault();
      selectProblem(results[activeIndex]);
    } else if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#525866]" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
          onKeyDown={handleKeyDown}
          placeholder="Report a problem (e.g. 146 or LRU)"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${results[activeIndex]?.id}` : undefined}
          className="w-full bg-[#201f22] border border-white/[0.08] rounded py-2 pl-9 pr-4 font-mono text-[12px] text-[#F3F4F6] placeholder:text-[#525866] focus:border-[#bdc2ff] focus:ring-1 focus:ring-[#5e6ad2] transition-all outline-none"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#8A8F98]">...</span>}
      </div>

      {isOpen && results.length > 0 && (
        <div id={listboxId} role="listbox" className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0A0A0C] border border-white/[0.08] rounded overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
          {results.map((p, index) => (
            <button
              key={p.id}
              id={`${listboxId}-${p.id}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => selectProblem(p)}
              className={`w-full text-left px-3.5 py-2.5 border-b border-white/[0.04] last:border-b-0
                         hover:bg-[#121217] transition-colors cursor-pointer flex items-center justify-between gap-3
                         ${index === activeIndex ? 'bg-[#121217]' : ''}`}
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-[#F3F4F6] truncate">{p.title}</div>
                <div className="font-mono text-[10px] text-[#8A8F98] tracking-wider mt-0.5">
                  {p.topicTags.slice(0, 3).join(' · ')}
                </div>
              </div>
              <DifficultyBadge difficulty={p.difficulty} />
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0A0A0C] border border-white/[0.08] rounded px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
          <p className="font-mono text-xs text-[#8A8F98]">No problems found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
