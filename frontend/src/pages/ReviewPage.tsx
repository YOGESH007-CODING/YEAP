import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge, DifficultyBadge } from '../components/ui/Badge';
import { QualitySelector } from '../components/ui/QualitySelector';

interface Problem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  topicTags: string[];
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

interface ProblemResponse { success: boolean; data: Problem; }

export function ReviewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ReportResponse['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    loadProblem(slug);
  }, [slug]);

  async function loadProblem(s: string) {
    setLoading(true);
    try {
      const res = await api.get<ProblemResponse>(`/api/problems/${encodeURIComponent(s)}`);
      setProblem(res.data);
    } catch {
      setError('Failed to load problem');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (qualityScore === null || !slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<ReportResponse>('/api/review/report', {
        problemSlug: slug,
        qualityScore,
      });
      setResult(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-16 text-center">
        <span className="font-data text-xs uppercase tracking-widest text-[#737373]">Loading...</span>
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="font-display text-2xl text-[#A3A3A3] tracking-[1em] mb-4">✦ ✦ ✦</div>
            <h1 className="font-display text-4xl lg:text-5xl font-black text-[#111] mb-2">
              Review Submitted
            </h1>
            <p className="font-body text-lg text-[#525252]">
              {result.problemTitle}
            </p>
          </div>

          {/* Result card */}
          <div className="border-4 border-[#111] bg-[#F9F9F7]">
            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#111]">
              {[
                { label: 'Quality', value: `${result.qualityScore}/5` },
                { label: 'New Interval', value: `${result.newInterval} day(s)` },
                { label: 'EF Score', value: result.newEasinessFactor.toFixed(2) },
                { label: 'Repetitions', value: result.repetitions },
              ].map(({ label, value }, i) => (
                <div key={i} className={`p-4 ${i < 3 ? 'border-r border-[#111] max-md:even:border-r-0' : ''} ${i < 2 ? 'max-md:border-b max-md:border-[#111]' : ''}`}>
                  <div className="font-data text-[10px] uppercase tracking-widest text-[#737373]">{label}</div>
                  <div className="font-display text-2xl font-black mt-1">{value}</div>
                </div>
              ))}
            </div>
            <div className="p-6 text-center">
              <p className="font-body text-sm text-[#525252] mb-1">Next review scheduled for</p>
              <p className="font-data text-lg font-semibold text-[#111]">
                {new Date(result.nextDueDate).toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>

          <div className="flex gap-4 mt-8">
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={14} strokeWidth={1.5} />
              Dashboard
            </Button>
            <Button variant="primary" onClick={() => navigate('/dashboard')} className="flex-1">
              Continue
              <ArrowRight size={14} strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Review form ────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link to="/dashboard" className="font-data text-[10px] uppercase tracking-widest text-[#737373] no-underline hover:text-[#CC0000]">
          Dashboard
        </Link>
        <ChevronRight size={12} className="text-[#A3A3A3]" />
        <span className="font-data text-[10px] uppercase tracking-widest text-[#111]">Review</span>
      </div>

      <div className="max-w-3xl">
        {/* Problem header */}
        <div className="border-b-4 border-[#111] pb-4 mb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl lg:text-5xl font-black leading-[0.95] text-[#111]">
              {problem?.title || slug}
            </h1>
            <a
              href={`https://leetcode.com/problems/${slug}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-data text-[10px] uppercase tracking-widest text-[#737373] hover:text-[#CC0000] no-underline shrink-0 mt-2"
            >
              LeetCode <ExternalLink size={12} strokeWidth={1.5} />
            </a>
          </div>

          {/* Tags */}
          {problem && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <DifficultyBadge difficulty={problem.difficulty} />
              {problem.topicTags.map(tag => (
                <Badge key={tag} variant="muted">{tag}</Badge>
              ))}
            </div>
          )}
        </div>

        {/* Quality selector */}
        <div className="mb-8">
          <h2 className="font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] mb-4">
            How well did you recall this problem?
          </h2>
          <QualitySelector value={qualityScore} onChange={setQualityScore} />
        </div>

        {/* Error */}
        {error && (
          <div className="border border-[#CC0000] bg-red-50 p-4 mb-4">
            <p className="font-body text-sm text-[#CC0000]">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={14} strokeWidth={1.5} />
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={qualityScore === null || submitting}
            className="flex-1"
          >
            {submitting ? 'Submitting...' : qualityScore !== null ? `Submit Quality ${qualityScore}` : 'Select a Score'}
          </Button>
        </div>
      </div>
    </div>
  );
}
