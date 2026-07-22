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
    if (query.length < 2) { setResults([]); setIsOpen(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResponse>(`/api/problems/search?q=${encodeURIComponent(query)}&limit=8`);
        setResults(res.data.problems);
        setIsOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search problems..."
          className="font-mono w-full bg-[#0F0F12] border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-[#EDEDEF]
                     placeholder:text-gray-500 focus:border-[#5E6AD2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] focus:outline-none transition-all duration-200"
        />
        {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#8A8F98]">...</span>}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0a0a0c] border border-white/[0.08] rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => { navigate(`/review/${p.slug}`); setQuery(''); setIsOpen(false); }}
              className="w-full text-left px-4 py-3 border-b border-white/[0.04] last:border-b-0
                         hover:bg-white/[0.05] transition-colors cursor-pointer flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#EDEDEF] truncate">{p.title}</div>
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
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-[#0a0a0c] border border-white/[0.08] rounded-xl px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <p className="text-sm text-[#8A8F98]">No problems found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
