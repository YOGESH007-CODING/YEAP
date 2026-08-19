/**
 * src/pages/LinkLeetcodePage.tsx
 *
 * Interstitial shown after sign-in / sign-up when the user hasn't linked a
 * LeetCode account yet. Once the username is saved the user is sent to /dashboard.
 *
 * Route guard: App.tsx prevents authenticated users who already have a
 * leetcodeUsername from reaching this page (they get redirected to /dashboard).
 */

import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code2, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import type { AuthUser } from '../lib/auth';

export function LinkLeetcodePage() {
  const { user, token, signIn, signOut } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      setError('Please enter your LeetCode username.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.patch<{ success: boolean; data: AuthUser }>(
        '/api/auth/profile',
        { leetcodeUsername: trimmed }
      );

      if (res.success && res.data && token) {
        signIn({ accessToken: token, user: res.data });
        setSaved(true);
        // Small delay so the success state is visible before navigating
        setTimeout(() => navigate('/dashboard', { replace: true }), 700);
      } else {
        throw new Error('Failed to save LeetCode username.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#020203] text-[#F3F4F6] flex items-center justify-center px-4 selection:bg-[#5e6ad2] selection:text-[#fdfaff]">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[400px] bg-[rgba(94,106,210,0.12)] rounded-full blur-[140px] pointer-events-none -z-0" />
      <div className="fixed bottom-0 right-1/4 w-[400px] h-[300px] bg-[rgba(94,106,210,0.06)] rounded-full blur-[120px] pointer-events-none -z-0" />

      <div className="relative z-10 w-full max-w-md">
        {/* Icon badge */}
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[rgba(94,106,210,0.15)] border border-[rgba(94,106,210,0.3)] flex items-center justify-center shadow-[0_0_30px_rgba(94,106,210,0.2)]">
            <Code2 className="w-8 h-8 text-[#5e6ad2]" />
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold text-center text-[#F3F4F6] mb-2 tracking-tight">
          Link your LeetCode account
        </h1>
        <p className="text-center text-[rgba(243,244,246,0.5)] text-sm mb-8 leading-relaxed">
          {user?.name ? `Hey ${user.name}! YEAP` : 'YEAP'} needs your LeetCode username to pull in
          your submission history and generate personalised reviews.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Input group */}
          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <span className="text-[rgba(243,244,246,0.3)] text-sm font-mono">@</span>
            </div>
            <input
              id="leetcode-username-input"
              type="text"
              autoComplete="off"
              autoFocus
              placeholder="your-leetcode-handle"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError(null);
              }}
              disabled={loading || saved}
              className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 pl-8 py-3 text-sm text-[#F3F4F6] placeholder-[rgba(243,244,246,0.25)] outline-none focus:border-[rgba(94,106,210,0.6)] focus:ring-1 focus:ring-[rgba(94,106,210,0.3)] transition-all disabled:opacity-50"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-[#ef4444] mt-0.5 shrink-0" />
              <p className="text-[#ef4444] text-sm leading-snug">{error}</p>
            </div>
          )}

          {/* Success feedback */}
          {saved && (
            <div className="flex items-center gap-2 bg-[rgba(34,197,94,0.08)] border border-[rgba(34,197,94,0.2)] rounded-xl px-4 py-3">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
              <p className="text-[#22c55e] text-sm">Account linked! Redirecting…</p>
            </div>
          )}

          {/* Submit */}
          <button
            id="link-leetcode-submit"
            type="submit"
            disabled={loading || saved}
            className="w-full flex items-center justify-center gap-2 bg-[#5e6ad2] hover:bg-[#4f5abf] disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-3 text-sm transition-all duration-200 shadow-[0_0_20px_rgba(94,106,210,0.3)]"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying…
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Linked!
              </>
            ) : (
              <>
                Link account
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Escape hatch */}
        <div className="mt-6 text-center">
          <button
            id="link-leetcode-signout"
            onClick={handleSignOut}
            className="text-[rgba(243,244,246,0.35)] hover:text-[rgba(243,244,246,0.6)] text-xs underline-offset-4 hover:underline transition-colors"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    </div>
  );
}
