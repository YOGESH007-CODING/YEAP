import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ExternalLink, ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Badge, DifficultyBadge } from '../components/ui/Badge';
import { QualitySelector } from '../components/ui/QualitySelector';

interface Problem { id: string; slug: string; title: string; difficulty: string; topicTags: string[] }
interface ReportResponse {
  success: boolean; message: string;
  data: { problemId: string; problemSlug: string; problemTitle: string; difficulty: string; newInterval: number; newEasinessFactor: number; nextDueDate: string; repetitions: number; qualityScore: number };
}
interface ProblemResponse { success: boolean; data: Problem }

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
    api.get<ProblemResponse>(`/api/problems/${encodeURIComponent(slug)}`)
      .then(res => setProblem(res.data))
      .catch(() => setError('Failed to load problem'))
      .finally(() => setLoading(false));
  }, [slug]);

  async function handleSubmit() {
    if (qualityScore === null || !slug) return;
    setSubmitting(true); setError(null);
    try {
      const res = await api.post<ReportResponse>('/api/review/report', { problemSlug: slug, qualityScore });
      setResult(res.data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Submission failed'); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="mx-auto max-w-screen-xl px-4 py-16 text-center text-sm text-[#8A8F98]">Loading...</div>;

  // ── Result screen ──────────────────────────────────────────
  if (result) {
    return (
      <div className="mx-auto max-w-screen-xl px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5E6AD2]/20 border border-[#5E6AD2]/30 shadow-[0_0_30px_rgba(94,106,210,0.2)] mb-6">
            <CheckIcon />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent mb-1">
            Review Submitted
          </h1>
          <p className="text-sm text-[#8A8F98]">{result.problemTitle}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8 mb-8">
            {[
              { label: 'Quality', value: `${result.qualityScore}/5` },
              { label: 'Interval', value: `${result.newInterval}d` },
              { label: 'EF', value: result.newEasinessFactor.toFixed(2) },
              { label: 'Reps', value: result.repetitions },
            ].map(({ label, value }, i) => (
              <div key={i} className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/30">{label}</div>
                <div className="text-2xl font-semibold text-[#EDEDEF] mt-1">{value}</div>
              </div>
            ))}
          </div>

          <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 mb-8">
            <p className="text-sm text-[#8A8F98] mb-0.5">Next review</p>
            <p className="font-mono text-sm font-medium text-[#EDEDEF]">
              {new Date(result.nextDueDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              <ArrowLeft size={14} /> Dashboard
            </Button>
            <Button onClick={() => navigate('/dashboard')}>
              Continue <ArrowRight size={14} />
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
      <div className="flex items-center gap-1.5 mb-6">
        <Link to="/dashboard" className="font-mono text-[10px] uppercase tracking-widest text-[#8A8F98] no-underline hover:text-[#5E6AD2]">Dashboard</Link>
        <ChevronRight size={10} className="text-white/20" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-[#EDEDEF]">Review</span>
      </div>

      <div className="max-w-3xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent leading-tight">
              {problem?.title || slug}
            </h1>
            {problem && (
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <DifficultyBadge difficulty={problem.difficulty} />
                {problem.topicTags.map(tag => <Badge key={tag} variant="muted">{tag}</Badge>)}
              </div>
            )}
          </div>
          <a href={`https://leetcode.com/problems/${slug}/`} target="_blank" rel="noopener noreferrer"
             className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-[#8A8F98] hover:text-[#5E6AD2] no-underline shrink-0 mt-2">
            LeetCode <ExternalLink size={10} />
          </a>
        </div>

        <div className="mb-8">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98] mb-3">How well did you recall this?</h2>
          <QualitySelector value={qualityScore} onChange={setQualityScore} />
        </div>

        {error && (
          <div className="border border-red-500/30 bg-red-500/10 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}><ArrowLeft size={14} /> Cancel</Button>
          <Button onClick={handleSubmit} disabled={qualityScore === null || submitting} className="flex-1">
            {submitting ? 'Submitting...' : qualityScore !== null ? `Submit Quality ${qualityScore}` : 'Select a Score'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return <svg className="w-6 h-6 text-[#5E6AD2]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>;
}
