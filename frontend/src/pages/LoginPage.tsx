import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { API_BASE_URL, api, type AuthResponse } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const oauthBaseUrl = API_BASE_URL;
type VerificationRequiredResponse = { success: boolean; data: { verificationRequired: true } };

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [awaitingVerification, setAwaitingVerification] = useState(false);
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
      if (awaitingVerification) {
        const res = await api.post<AuthResponse>('/api/auth/verify-email', { email, code: verificationCode });
        signIn({ accessToken: res.data.accessToken, user: res.data.user });
        navigate('/dashboard');
        return;
      }
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const body = isRegistering ? { email, password, name, leetcodeUsername } : { email, password };
      if (isRegistering) {
        await api.post<VerificationRequiredResponse>(endpoint, body);
        setAwaitingVerification(true);
        return;
      }
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

  const resendCode = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post<VerificationRequiredResponse>('/api/auth/resend-verification', { email });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend the verification code');
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
          {!awaitingVerification && <div className="flex border-b border-white/[0.06] mb-6">
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
          </div>}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {awaitingVerification ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <h2 className="text-lg font-medium text-white">Verify your email</h2>
                <p className="mt-1 text-sm text-[#8A8F98]">If eligible, a six-digit code was sent to {email}.</p>
              </div>
              <Input
                label="Verification code"
                type="text"
                inputMode="numeric"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                required
                autoComplete="one-time-code"
              />
              <Button type="submit" fullWidth disabled={loading || verificationCode.length !== 6} className="mt-2">
                {loading ? 'Verifying...' : 'Verify Email'}
              </Button>
              <button type="button" onClick={resendCode} disabled={loading} className="w-full text-sm text-[#A5B4FC] hover:text-white disabled:opacity-50">
                Resend code
              </button>
              <button type="button" onClick={() => { setAwaitingVerification(false); setIsRegistering(false); setVerificationCode(''); setError(null); }} className="w-full text-sm text-[#8A8F98] hover:text-white">
                Back to sign in
              </button>
            </form>
          ) : <form onSubmit={handleSubmit} className="space-y-4">
            {isRegistering && (
              <>
                <Input label="Full Name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Smith" autoComplete="name" />
                <Input label="LeetCode Username" type="text" value={leetcodeUsername} onChange={(e) => setLeetcodeUsername(e.target.value)} placeholder="your_leetcode_username" required autoComplete="off" />
              </>
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

          }

          {!awaitingVerification && <><div className="flex items-center gap-3 my-6 text-[10px] font-mono tracking-widest text-white/30 uppercase">
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
          </>}
        </div>

        <p className="font-mono text-[10px] tracking-widest text-white/20 text-center mt-6 uppercase">
          SM-2 · Spaced Repetition · LeetCode
        </p>
      </div>
    </div>
  );
}
