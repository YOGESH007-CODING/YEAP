import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api, type AuthResponse } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const oauthBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const oauthHref = (provider: 'google' | 'github') => `${oauthBaseUrl}/api/auth/${provider}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering ? { email, password, name } : { email, password };
      const res = await api.post<AuthResponse>(endpoint, body);

      signIn({
        accessToken: res.data.accessToken,
        user: res.data.user,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 ambient-bg">
      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5E6AD2] shadow-[0_0_40px_rgba(94,106,210,0.4)] mb-6">
            <span className="text-white text-xl font-bold">Y</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight bg-gradient-to-b from-white via-white/95 to-white/70 bg-clip-text text-transparent">
            YEAP
          </h1>
          <p className="text-sm text-[#8A8F98] mt-2">
            Your Early AM Practice
          </p>
          <p className="font-mono text-[10px] tracking-widest text-white/30 mt-1 uppercase">
            Spaced Repetition for LeetCode
          </p>
        </div>

        {/* Login / Register Card */}
        <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)]">
          {/* Mode Switcher */}
          <div className="flex border-b border-white/[0.06] mb-6">
            <button
              type="button"
              onClick={() => { setIsRegistering(false); setError(null); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${!isRegistering
                  ? 'border-[#5E6AD2] text-white'
                  : 'border-transparent text-[#8A8F98] hover:text-white'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsRegistering(true); setError(null); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${isRegistering
                  ? 'border-[#5E6AD2] text-white'
                  : 'border-transparent text-[#8A8F98] hover:text-white'
                }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Smith"
                autoComplete="name"
              />
            )}
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
              required
              autoComplete="username"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
            />

            <Button type="submit" fullWidth disabled={loading} className="mt-2">
              {loading
                ? 'Processing...'
                : isRegistering
                  ? 'Create Account'
                  : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-6 text-[10px] font-mono tracking-widest text-white/30 uppercase">
            <span className="h-px flex-1 bg-white/[0.08]" />
            <span>or continue with</span>
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <a
              href={oauthHref('google')}
              className="rounded-lg bg-[#5E6AD2] px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#6E7AE2]"
            >
              Continue with Google
            </a>
            <a
              href={oauthHref('github')}
              className="rounded-lg bg-[#5E6AD2] px-3 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-[#6E7AE2]"
            >
              Continue with GitHub
            </a>
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-widest text-white/20 text-center mt-6 uppercase">
          SM-2 · Spaced Repetition · LeetCode
        </p>
      </div>
    </div>
  );
}
