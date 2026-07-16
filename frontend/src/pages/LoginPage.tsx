import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const googleButton = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || !googleButton.current) return;
    const initialize = () => {
      const google = (window as Window & { google?: { accounts: { id: { initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (element: HTMLElement, options: { theme: string; width: number }) => void } } } }).google;
      if (!google) return;
      google.accounts.id.initialize({ client_id: clientId, callback: (response) => {
        void (async () => {
          setSubmitting(true); setError(null);
          try {
            const result = await api.post<{ data: { accessToken: string; user: { id: string; email: string; name: string | null } } }>('/api/auth/google', { idToken: response.credential });
            signIn(result.data);
            navigate('/dashboard');
          } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Google sign in failed');
          } finally { setSubmitting(false); }
        })();
      } });
      google.accounts.id.renderButton(googleButton.current!, { theme: 'outline', width: 360 });
    };
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initialize;
    document.head.append(script);
    return () => script.remove();
  }, [navigate, signIn]);

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      const response = await api.post<{ data: { accessToken: string; user: { id: string; email: string; name: string | null } } }>(
        isRegistering ? '/api/auth/register' : '/api/auth/login', { email, password },
      );
      signIn(response.data);
      navigate('/dashboard');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Sign in failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 newsprint-texture">
      <div className="w-full max-w-md">
        {/* Masthead */}
        <div className="text-center mb-12">
          <div className="font-data text-[10px] uppercase tracking-[0.3em] text-[#737373] mb-4">
            Est. 2026 &nbsp;·&nbsp; Spaced Repetition for LeetCode
          </div>
          <h1 className="font-display text-6xl lg:text-8xl font-black tracking-tighter leading-[0.9] text-[#111]">
            YEAP
          </h1>
          <div className="mt-3 border-t-4 border-[#111] pt-3">
            <p className="font-display text-xl lg:text-2xl italic text-[#404040]">
              Your Early AM Practice
            </p>
          </div>
        </div>

        {/* Ornamental divider */}
        <div className="py-4 text-center font-display text-2xl text-[#A3A3A3] tracking-[1em]">
          ✦ ✦ ✦
        </div>

        {/* Login card */}
        <div className="border-4 border-[#111] bg-[#F9F9F7] p-8">
          <h2 className="font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] mb-6 text-center">
            Sign In to Continue
          </h2>

          <div ref={googleButton} className="mb-4" />
          {!import.meta.env.VITE_GOOGLE_CLIENT_ID && <Button fullWidth className="mb-4" disabled title="Set VITE_GOOGLE_CLIENT_ID to enable Google login">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google (configure client ID)
          </Button>}

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 border-t border-[#E5E5E0]" />
            <span className="font-data text-[10px] uppercase tracking-widest text-[#A3A3A3]">
              Email & Password
            </span>
            <div className="flex-1 border-t border-[#E5E5E0]" />
          </div>

          {error && <p className="mb-4 text-sm text-[#CC0000]">{error}</p>}
          <div className="space-y-4">
            <Input
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
            />
            <Input label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} />
            <Button variant="secondary" fullWidth onClick={handleSubmit} disabled={submitting || !email || !password}>
              {submitting ? 'Please wait...' : isRegistering ? 'Create Account' : 'Sign In'}
            </Button>
            <button className="w-full text-xs underline" onClick={() => setIsRegistering((value) => !value)}>
              {isRegistering ? 'Already have an account? Sign in' : 'Need an account? Register'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <span className="font-data text-[10px] uppercase tracking-widest text-[#A3A3A3]">
            SM-2 Algorithm &nbsp;·&nbsp; Spaced Repetition &nbsp;·&nbsp; LeetCode
          </span>
        </div>
      </div>
    </div>
  );
}
