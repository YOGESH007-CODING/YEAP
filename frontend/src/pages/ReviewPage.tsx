import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ExternalLink, ArrowRight, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { DifficultyBadge } from '../components/ui/Badge';
import { QualitySelector } from '../components/ui/QualitySelector';

interface Note {
  noteText: string;
  importantFlag: boolean;
}

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topicTags: string[];
  note?: Note | null;
}

interface ReportResponse {
  success: boolean;
  message: string;
  data: {
    problemId: string;
    problemSlug: string;
    problemTitle: string;
    difficulty: string;
    newInterval: number;
    newEasinessFactor: number;
    nextDueDate: string;
    repetitions: number;
    qualityScore: number;
  };
}

interface ProblemResponse {
  success: boolean;
  data: Problem;
}

export function ReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReportResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mistakeType, setMistakeType] = useState('');
  const [mistakeDescription, setMistakeDescription] = useState('');
  const [noteText, setNoteText] = useState('');
  const [importantFlag, setImportantFlag] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get<ProblemResponse>(`/api/problems/${encodeURIComponent(slug)}`)
      .then((res) => {
        setProblem(res.data);
        setNoteText(res.data.note?.noteText ?? '');
        setImportantFlag(res.data.note?.importantFlag ?? false);
      })
      .catch(() => setError('Failed to load problem'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleGradeSelect = useCallback((score: number) => {
    setQualityScore(score);
    if (score > 2) {
      setMistakeType('');
      setMistakeDescription('');
    }
  }, []);

  // Keyboard shortcut listener (1-6 for grades 0-5)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in textarea or input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 6 && !result) {
        handleGradeSelect(num - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGradeSelect, result]);

  async function handleSubmit() {
    if (qualityScore === null || !slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const mistake =
        qualityScore <= 2 && mistakeType
          ? { type: mistakeType, description: mistakeDescription || undefined }
          : undefined;

      const res = await api.post<ReportResponse>('/api/review/report', {
        problemSlug: slug,
        qualityScore,
        mistake,
      });

      if (problem && noteText.trim()) {
        await api.patch(`/api/notes/${problem.id}`, {
          noteText: noteText.trim(),
          importantFlag,
        });
      }
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveNote() {
    if (!problem || !noteText.trim()) return;
    setSavingNote(true);
    setError(null);
    setNoteSaved(false);
    try {
      await api.patch(`/api/notes/${problem.id}`, {
        noteText: noteText.trim(),
        importantFlag,
      });
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save note');
    } finally {
      setSavingNote(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-16 text-center font-mono text-xs text-[#8A8F98]">
        Loading problem stream...
      </div>
    );
  }

  // ── Celebration / Completion Screen ─────────────────────────────────────────
  if (result) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16 text-center flex flex-col items-center justify-center relative">
        {/* Glow backdrop */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[rgba(94,106,210,0.18)] blur-[80px] rounded-full pointer-events-none" />

        {/* Checkmark Icon Circle */}
        <div className="w-20 h-20 rounded-full bg-[#0A0A0C] border border-[rgba(94,106,210,0.4)] flex items-center justify-center noise-texture shadow-[0_0_30px_rgba(189,194,255,0.15)] mb-6 relative z-10">
          <CheckCircle2 size={40} className="text-[#bdc2ff]" />
        </div>

        <div className="space-y-1 mb-8 relative z-10">
          <h1 className="font-headline text-3xl font-bold text-[#F3F4F6]">
            Review Complete
          </h1>
          <p className="font-mono text-xs text-[#8A8F98]">
            Next practice scheduled for:{' '}
            <span className="text-[#bdc2ff] font-medium ml-1">
              {new Date(result.nextDueDate).toLocaleDateString('en-US', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </p>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg mb-8 relative z-10">
          {/* Metric 1 */}
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-lg p-4 flex flex-col items-center justify-center noise-texture">
            <div className="font-mono text-2xl font-bold text-[#F3F4F6]">
              {result.qualityScore}/5
            </div>
            <div className="font-mono text-[10px] text-[#525866] mt-1 uppercase tracking-wider">
              Quality
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-lg p-4 flex flex-col items-center justify-center noise-texture relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4bdcc6]" />
            <div className="font-mono text-2xl font-bold text-[#4bdcc6]">
              +{result.newInterval}d
            </div>
            <div className="font-mono text-[10px] text-[#525866] mt-1 uppercase tracking-wider">
              New Int
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-lg p-4 flex flex-col items-center justify-center noise-texture relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#bdc2ff]" />
            <div className="font-mono text-2xl font-bold text-[#bdc2ff]">
              {result.newEasinessFactor.toFixed(2)}
            </div>
            <div className="font-mono text-[10px] text-[#525866] mt-1 uppercase tracking-wider">
              New EF
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 relative z-10">
          <Button variant="secondary" onClick={() => navigate('/dashboard')}>
            Dashboard
          </Button>
          <Button onClick={() => navigate('/dashboard')} className="flex items-center gap-2">
            <span>Continue Stream</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    );
  }

  // ── Active Review Interface ────────────────────────────────────────────────
  return (
    <div className="max-w-[1280px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        {/* Breadcrumbs & Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#525866] uppercase tracking-widest">
            <Link to="/dashboard" className="hover:text-[#bdc2ff] no-underline transition-colors">
              Dashboard
            </Link>
            <ChevronRight size={10} />
            <span className="text-[#8A8F98]">Review</span>
            <ChevronRight size={10} />
            <span className="text-[#bdc2ff] truncate max-w-[200px]">{slug}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#F3F4F6] m-0">
                {problem?.title || slug}
              </h1>
              {problem && <DifficultyBadge difficulty={problem.difficulty} />}
            </div>

            <a
              href={`https://leetcode.com/problems/${slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-white/[0.08] bg-[#050506] font-mono text-[11px] text-[#8A8F98] hover:text-[#bdc2ff] hover:border-[#bdc2ff]/30 transition-colors no-underline"
            >
              <span>LeetCode</span>
              <ExternalLink size={12} />
            </a>
          </div>

          {problem && problem.topicTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {problem.topicTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#201f22] text-[#8A8F98] border border-white/[0.06]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Grading Matrix Box */}
        <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-lg p-5 noise-texture">
          <div className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider mb-3">
            GRADE YOUR RECALL
          </div>
          <QualitySelector value={qualityScore} onChange={handleGradeSelect} />
        </div>

        {/* Conditional Mistake Diagnosis Box (grades 0, 1, 2) */}
        {qualityScore !== null && qualityScore <= 2 && (
          <div className="bg-[#050506] border border-[#FF375F]/30 rounded-lg p-5 noise-texture transition-all duration-200">
            <div className="font-mono text-[11px] text-[#FF375F] mb-3 flex items-center gap-1.5 font-medium uppercase tracking-wider">
              <AlertCircle size={15} />
              <span>DIAGNOSIS REQUIRED</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8A8F98] mb-1">
                  Error Type
                </label>
                <select
                  value={mistakeType}
                  onChange={(e) => setMistakeType(e.target.value)}
                  className="w-full bg-[#131316] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#F3F4F6] focus:border-[#FF375F] focus:outline-none transition-colors"
                >
                  <option value="">Select failure mode...</option>
                  <option value="LOGIC_ERROR">Logic Error</option>
                  <option value="SYNTAX_SLIP">Syntax / API Memory</option>
                  <option value="EDGE_CASE">Edge Case Missed</option>
                  <option value="WRONG_APPROACH">Optimal Approach Forgotten</option>
                  <option value="TIME_COMPLEXITY">Time / Space Complexity Suboptimal</option>
                  <option value="MISREAD_PROBLEM">Misread Problem Requirements</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase tracking-wider text-[#8A8F98] mb-1">
                  Retrospective Notes
                </label>
                <textarea
                  value={mistakeDescription}
                  onChange={(e) => setMistakeDescription(e.target.value)}
                  maxLength={500}
                  placeholder="What exactly broke down? (e.g., forgot two-pointer window shift condition)"
                  className="w-full bg-[#131316] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#F3F4F6] focus:border-[#FF375F] focus:outline-none resize-none h-20 placeholder:text-[#525866]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Retrospective / Personal Notes Box */}
        <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-lg p-5 noise-texture space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-mono text-[11px] font-medium text-[#8A8F98] uppercase tracking-wider">
              Pattern / Personal Notes
            </label>
            <label className="flex items-center gap-1.5 font-mono text-[11px] text-[#8A8F98] cursor-pointer">
              <input
                type="checkbox"
                checked={importantFlag}
                onChange={(e) => setImportantFlag(e.target.checked)}
                className="rounded border-white/[0.1] bg-[#131316] text-[#5e6ad2] focus:ring-0"
              />
              <span>Key Insight</span>
            </label>
          </div>

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            maxLength={10000}
            placeholder="Key patterns, edge cases, invariants to remember..."
            className="w-full bg-[#131316] border border-white/[0.08] rounded px-3 py-2 font-mono text-xs text-[#F3F4F6] focus:border-[#bdc2ff] focus:outline-none resize-none h-24 placeholder:text-[#525866]"
          />

          <div className="flex justify-between items-center pt-1">
            <span className="font-mono text-[10px] text-[#525866]">
              {noteSaved && <span className="text-[#4bdcc6]">✓ Note saved to protocol</span>}
            </span>
            <button
              type="button"
              onClick={saveNote}
              disabled={!noteText.trim() || savingNote}
              className="font-mono text-[11px] text-[#bdc2ff] hover:text-white uppercase transition-colors cursor-pointer disabled:opacity-40"
            >
              {savingNote ? 'Saving...' : 'Save Note Only'}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-[#FF375F]/10 border border-[#FF375F]/30 rounded font-mono text-xs text-[#FF375F]">
            {error}
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={qualityScore === null || submitting}
            className="flex-1"
          >
            {submitting
              ? 'Submitting sequence...'
              : qualityScore !== null
              ? `Submit Grade ${qualityScore} & Schedule`
              : 'Select Grade to Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
