import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { API_BASE_URL, api, type AuthResponse } from '../lib/api';
import { ThemeToggle } from '../components/ui/ThemeToggle';

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
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const verificationCode = otpDigits.join('');

  const oauthHref = (provider: 'google' | 'github') => `${oauthBaseUrl}/api/auth/${provider}`;

  useEffect(() => {
    if (awaitingVerification && otpInputsRef.current[0]) {
      otpInputsRef.current[0].focus();
    }
  }, [awaitingVerification]);

  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    if (cleaned.length > 1) {
      // Pasted code
      const digits = cleaned.slice(0, 6).split('');
      const newDigits = [...otpDigits];
      digits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextIdx = Math.min(digits.length, 5);
      otpInputsRef.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = cleaned[0];
    setOtpDigits(newDigits);

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (!awaitingVerification && !password)) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      if (awaitingVerification) {
        if (verificationCode.length !== 6) {
          setError('Please enter the complete 6-digit code');
          setLoading(false);
          return;
        }
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
    setResendSuccess(false);
    try {
      await api.post<VerificationRequiredResponse>('/api/auth/resend-verification', { email });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to resend verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#020203] text-[#F3F4F6] min-h-screen flex items-center justify-center relative overflow-hidden antialiased selection:bg-[#5e6ad2] selection:text-[#fdfaff] px-4 py-8">
      {/* Ambient Radial Indigo Glow */}
      <div className="absolute w-[800px] h-[800px] bg-[rgba(94,106,210,0.08)] rounded-full blur-[140px] pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0" />

      <div className="absolute right-4 top-4 z-20">
        <ThemeToggle />
      </div>

      {/* Main Authentication Card */}
      <main className="w-full max-w-sm bg-[#050506] border border-white/[0.08] rounded-lg relative z-10 overflow-hidden flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        {/* Micro-noise overlay */}
        <div className="absolute inset-0 micro-noise pointer-events-none opacity-30 mix-blend-overlay" />

        <div className="p-6 sm:p-8 relative z-10 flex flex-col h-full">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="w-10 h-10 mx-auto bg-[#121217] border border-white/[0.08] rounded flex items-center justify-center mb-3">
              <Terminal size={18} className="text-[#bdc2ff]" />
            </div>
            <h1 className="font-headline text-xl font-semibold text-[#F3F4F6] tracking-tight mb-1">
              System Authorization
            </h1>
            <p className="font-mono text-[10px] text-[#8A8F98] uppercase tracking-wider">
              v2.4.0-stable
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded bg-[#FF375F]/10 border border-[#FF375F]/30 text-[#FF375F] text-xs font-mono">
              {error}
            </div>
          )}

          {resendSuccess && (
            <div className="mb-4 p-3 rounded bg-[#4bdcc6]/10 border border-[#4bdcc6]/30 text-[#4bdcc6] text-xs font-mono">
              ✓ Verification sequence dispatched to email.
            </div>
          )}

          {/* OTP Verification View */}
          {awaitingVerification ? (
            <div className="flex flex-col">
              <button
                type="button"
                className="self-start -mt-2 mb-4 text-[#525866] hover:text-[#F3F4F6] transition-colors flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider cursor-pointer group"
                onClick={() => {
                  setAwaitingVerification(false);
                  setIsRegistering(false);
                  setOtpDigits(['', '', '', '', '', '']);
                  setError(null);
                }}
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                <span>ABORT</span>
              </button>

              <div className="text-center mb-5">
                <h2 className="font-headline text-base font-semibold text-[#F3F4F6] mb-1">Verification Required</h2>
                <p className="font-mono text-xs text-[#8A8F98]">
                  Enter the 6-digit sequence sent to <br />
                  <span className="text-[#bdc2ff] font-medium">{email}</span>
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 6 Segmented PIN boxes */}
                <div className="flex justify-between gap-1.5 sm:gap-2">
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => { otpInputsRef.current[idx] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-13 text-center bg-[#0A0A0C] border border-white/[0.08] rounded font-mono text-xl text-[#F3F4F6] focus:border-[rgba(94,106,210,0.5)] focus:ring-1 focus:ring-[#5e6ad2] focus:outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#525866] flex items-center gap-1">
                    Expires in <span className="text-[#4bdcc6]">10:00</span>
                  </span>
                  <button
                    type="button"
                    onClick={resendCode}
                    disabled={loading}
                    className="text-[#bdc2ff] hover:text-white uppercase transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Resend Code
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full py-2.5 bg-[#5e6ad2] text-[#fdfaff] font-mono text-[12px] font-medium uppercase tracking-[0.04em] rounded border-t border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#4854bb] hover:shadow-[0_0_15px_rgba(94,106,210,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>{loading ? 'Verifying...' : 'Verify Sequence'}</span>
                  <Lock size={14} />
                </button>
              </form>
            </div>
          ) : (
            /* Authentication View (Sign In / Register) */
            <div>
              {/* Segmented Control */}
              <div className="flex p-1 bg-[#121217] border border-white/[0.08] rounded-md mb-5">
                <button
                  type="button"
                  onClick={() => { setIsRegistering(false); setError(null); }}
                  className={`flex-1 py-1.5 text-center font-mono text-[11px] font-medium uppercase tracking-wider rounded transition-all cursor-pointer ${
                    !isRegistering
                      ? 'bg-[#0A0A0C] text-[#F3F4F6] border border-[rgba(94,106,210,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'text-[#525866] hover:text-[#8A8F98] border border-transparent'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setIsRegistering(true); setError(null); }}
                  className={`flex-1 py-1.5 text-center font-mono text-[11px] font-medium uppercase tracking-wider rounded transition-all cursor-pointer ${
                    isRegistering
                      ? 'bg-[#0A0A0C] text-[#F3F4F6] border border-[rgba(94,106,210,0.3)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
                      : 'text-[#525866] hover:text-[#8A8F98] border border-transparent'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {isRegistering && (
                  <>
                    <div className="space-y-1">
                      <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[#8A8F98]">
                        FULL_NAME
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Alex Turing"
                        autoComplete="name"
                        className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-sm text-[#F3F4F6] placeholder:text-[#525866] focus:border-[rgba(94,106,210,0.5)] focus:ring-1 focus:ring-[#5e6ad2] focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[#8A8F98]">
                        LEETCODE_USERNAME
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-[#525866]">@</span>
                        <input
                          type="text"
                          value={leetcodeUsername}
                          onChange={(e) => setLeetcodeUsername(e.target.value)}
                          placeholder="username"
                          required
                          autoComplete="off"
                          className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded pl-8 pr-3 py-2 font-mono text-sm text-[#F3F4F6] placeholder:text-[#525866] focus:border-[rgba(94,106,210,0.5)] focus:ring-1 focus:ring-[#5e6ad2] focus:outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[#8A8F98]">
                    EMAIL_ADDRESS
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="dev@yeap.srs"
                    required
                    autoComplete="username"
                    className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-sm text-[#F3F4F6] placeholder:text-[#525866] focus:border-[rgba(94,106,210,0.5)] focus:ring-1 focus:ring-[#5e6ad2] focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[11px] uppercase tracking-[0.06em] text-[#8A8F98]">
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    className="w-full bg-[#0A0A0C] border border-white/[0.08] rounded px-3 py-2 font-mono text-sm text-[#F3F4F6] placeholder:text-[#525866] tracking-widest focus:border-[rgba(94,106,210,0.5)] focus:ring-1 focus:ring-[#5e6ad2] focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-5 py-2.5 bg-[#5e6ad2] text-[#fdfaff] font-mono text-[12px] font-medium uppercase tracking-[0.04em] rounded border-t border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#4854bb] hover:shadow-[0_0_15px_rgba(94,106,210,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                >
                  <span>{loading ? 'Processing...' : 'Execute'}</span>
                  <ArrowRight size={14} />
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="font-mono text-[10px] text-[#525866] uppercase tracking-wider">OAUTH_PROVIDERS</span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>

              {/* OAuth Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={oauthHref('github')}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-[#0A0A0C] border border-white/[0.08] rounded hover:bg-[#121217] hover:border-white/[0.2] transition-colors font-mono text-[11px] text-[#8A8F98] hover:text-[#F3F4F6] no-underline"
                >
                  <svg className="w-4 h-4 fill-current text-[#F3F4F6]" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>GITHUB</span>
                </a>
                <a
                  href={oauthHref('google')}
                  className="flex items-center justify-center gap-2 py-2 px-3 bg-[#0A0A0C] border border-white/[0.08] rounded hover:bg-[#121217] hover:border-white/[0.2] transition-colors font-mono text-[11px] text-[#8A8F98] hover:text-[#F3F4F6] no-underline"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span>GOOGLE</span>
                </a>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
