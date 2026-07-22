import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, generateDevToken } from '../lib/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState('test-user-id');
  const [email, setEmail] = useState('test@example.com');

  const handleDevSignIn = () => {
    const token = generateDevToken(userId, email);
    signIn({
      accessToken: token,
      user: { id: userId, email, name: userId }
    });
    navigate('/dashboard');
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

        {/* Login card */}
        <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.06] rounded-2xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_40px_rgba(0,0,0,0.4)]">
          {/* Google OAuth (placeholder) */}
          <Button fullWidth className="mb-4" disabled>
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Sign in with Google (Coming Soon)
          </Button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="font-mono text-[10px] tracking-widest text-white/30 uppercase">Dev Mode</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Dev token login */}
          <div className="space-y-4">
            <Input label="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="test-user-id" />
            <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test@example.com" />
            <Button variant="secondary" fullWidth onClick={handleDevSignIn}>Sign In (Dev Token)</Button>
          </div>
        </div>

        <p className="font-mono text-[10px] tracking-widest text-white/20 text-center mt-6 uppercase">
          SM-2 · Spaced Repetition · LeetCode
        </p>
      </div>
    </div>
  );
}
