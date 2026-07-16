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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResponse>(`/api/problems/search?q=${encodeURIComponent(query)}&limit=8`);
        setResults(res.data.problems);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={16} strokeWidth={1.5} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#737373]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems..."
          className="font-data w-full border-b-2 border-[#111] bg-transparent pl-8 pr-3 py-2 text-sm
                     placeholder:text-[#A3A3A3] focus:bg-[#F0F0F0] focus:outline-none transition-colors"
        />
        {loading && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 font-data text-[10px] text-[#737373] uppercase tracking-widest">
            ...
          </span>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 bg-[#F9F9F7] border border-[#111] border-t-0 max-h-80 overflow-y-auto">
          {results.map((problem) => (
            <button
              key={problem.id}
              onClick={() => {
                navigate(`/review/${problem.slug}`);
                setQuery('');
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-3 border-b border-[#E5E5E0] last:border-b-0
                         hover:bg-[#F5F5F5] transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold truncate">{problem.title}</div>
                <div className="font-data text-[10px] text-[#737373] uppercase tracking-widest mt-0.5">
                  {problem.topicTags.slice(0, 3).join(' · ')}
                </div>
              </div>
              <DifficultyBadge difficulty={problem.difficulty} />
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 top-full left-0 right-0 bg-[#F9F9F7] border border-[#111] border-t-0 px-4 py-3">
          <p className="font-body text-sm text-[#737373] italic">No problems found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
