import { Link } from 'react-router-dom';
import { ArrowRight, Terminal, Sparkles, CheckCircle2, Cpu, Brain, Layers } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { ThemeToggle } from '../components/ui/ThemeToggle';

export function LandingPage() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="bg-[#020203] text-[#F3F4F6] min-h-screen relative overflow-x-hidden selection:bg-[#5e6ad2] selection:text-[#fdfaff]">
      {/* Top Ambient Radial Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[rgba(94,106,210,0.12)] rounded-full blur-[140px] pointer-events-none -z-0" />

      {/* Top Navbar */}
      <nav className="fixed top-0 inset-x-0 h-14 z-50 border-b border-white/[0.08] bg-[#050506]/90 backdrop-blur-md">
        <div className="max-w-[1280px] mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 no-underline">
              <div className="w-7 h-7 bg-[#5e6ad2] rounded flex items-center justify-center font-mono text-white text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
                Y
              </div>
              <span className="font-mono text-lg font-bold tracking-tight text-[#bdc2ff]">
                YEAP
              </span>
            </Link>
            <span className="hidden sm:inline-block font-mono text-[10px] text-[#525866] border-l border-white/[0.1] pl-3 uppercase">
              Your Early AM Practice
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-[#8A8F98] px-3 py-1 rounded bg-[#121217] border border-white/[0.08]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4bdcc6] animate-pulse" />
              <span>04:00 AM Worker Active</span>
            </div>

            <ThemeToggle />

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="bg-[#5e6ad2] text-[#fdfaff] font-mono text-[11px] font-medium uppercase tracking-[0.04em] px-4 py-1.5 rounded border-t border-white/20 hover:bg-[#4854bb] transition-all no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] flex items-center gap-1.5"
              >
                <span>Command Center</span>
                <ArrowRight size={13} />
              </Link>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="font-mono text-[11px] uppercase tracking-wider text-[#8A8F98] hover:text-[#F3F4F6] px-2.5 py-1.5 transition-colors no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/login"
                  className="bg-[#5e6ad2] text-[#fdfaff] font-mono text-[11px] font-medium uppercase tracking-[0.04em] px-3.5 py-1.5 rounded border-t border-white/20 hover:bg-[#4854bb] transition-all no-underline shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="relative z-10 pt-[110px] pb-24 max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center text-center max-w-4xl mx-auto mb-28">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[rgba(94,106,210,0.35)] bg-[#121217] text-[#bdc2ff] font-mono text-[11px] mb-6 shadow-[0_0_20px_rgba(94,106,210,0.1)]">
            <Sparkles size={13} />
            <span>Automatic LeetCode Sync · SM-2 Algorithm Engine</span>
          </div>

          <h1 className="font-headline text-[36px] sm:text-[52px] md:text-[60px] font-bold leading-[1.1] tracking-tight mb-5 text-[#F3F4F6]">
            Stop forgetting LeetCode problems.<br />
            <span className="text-[#bdc2ff]">Master algorithms with SM-2.</span>
          </h1>

          <p className="font-mono text-sm text-[#8A8F98] max-w-2xl mx-auto mb-8 leading-relaxed">
            A high-performance spaced repetition system built exclusively for software engineers.
            Sync your solves, receive morning review queues, and encode algorithm patterns directly into long-term memory.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 mb-10 w-full sm:w-auto">
            <Link
              to={isAuthenticated ? '/dashboard' : '/login'}
              className="w-full sm:w-auto bg-[#5e6ad2] text-[#fdfaff] font-mono text-xs font-medium uppercase tracking-[0.06em] px-6 py-3 rounded border-t border-white/20 hover:bg-[#4854bb] hover:shadow-[0_0_20px_rgba(94,106,210,0.4)] transition-all flex items-center justify-center gap-2 no-underline"
            >
              <span>{isAuthenticated ? 'Open Command Center' : 'Initialize Memory Engine'}</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              to={isAuthenticated ? '/history' : '/login'}
              className="w-full sm:w-auto bg-[#050506] border border-white/[0.08] text-[#F3F4F6] font-mono text-xs font-medium uppercase tracking-[0.06em] px-6 py-3 rounded hover:bg-[#121217] hover:border-white/[0.2] transition-all flex items-center justify-center gap-2 no-underline"
            >
              <Terminal size={14} className="text-[#bdc2ff]" />
              <span>Explore Problem Lab</span>
            </Link>
          </div>

          <div className="flex items-center gap-3 text-[#525866] font-mono text-[11px]">
            <CheckCircle2 size={14} className="text-[#4bdcc6]" />
            <span>Built for FAANG & High-Growth Engineering Interviews</span>
          </div>
        </section>

        {/* 01 // The Core Engine Section */}
        <section className="mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="font-mono text-xs text-[#bdc2ff] uppercase tracking-widest">
                01 // The Core Engine
              </div>
              <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#F3F4F6]">
                The SM-2 Algorithm, calibrated for code.
              </h2>
              <p className="font-mono text-xs text-[#8A8F98] leading-relaxed">
                Standard flashcards fail for complex algorithms because they test rote memorization.
                YEAP uses a tuned SuperMemo-2 engine designed to track conceptual retention of patterns like Two Pointers, Dynamic Programming, Heap/Greedy, and Monotonic Stacks.
              </p>
              <p className="font-mono text-xs text-[#8A8F98] leading-relaxed">
                By adjusting interval schedules based on your specific mistake diagnosis (logic breakdown vs. syntax slip), you review a problem right before you would otherwise forget it.
              </p>
            </div>

            <div className="lg:col-span-6 bg-[#050506] border border-white/[0.08] p-5 rounded-lg font-mono text-xs text-[#8A8F98] noise-bg overflow-x-auto">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.06] text-[10px] text-[#525866]">
                <span>srs_engine.py</span>
                <span>v2.4.0-stable</span>
              </div>
              <pre className="text-[12px] leading-relaxed">
                <code>
                  <span className="text-[#bdc2ff]">def</span> <span className="text-[#F3F4F6]">calculate_next_interval</span>(q, n, ef):{'\n'}
                  {'    '}<span className="text-[#525866]"># q: Recall Quality (0-5)</span>{'\n'}
                  {'    '}<span className="text-[#525866]"># n: Successful Repetitions</span>{'\n'}
                  {'    '}<span className="text-[#525866]"># ef: Easiness Factor</span>{'\n\n'}
                  {'    '}<span className="text-[#bdc2ff]">if</span> q &lt; 3:{'\n'}
                  {'        '}n = 1{'\n'}
                  {'        '}interval = 1{'\n'}
                  {'    '}<span className="text-[#bdc2ff]">else</span>:{'\n'}
                  {'        '}n += 1{'\n'}
                  {'        '}interval = 1 <span className="text-[#bdc2ff]">if</span> n == 1 <span className="text-[#bdc2ff]">else</span> (6 <span className="text-[#bdc2ff]">if</span> n == 2 <span className="text-[#bdc2ff]">else</span> round(interval * ef)){'\n\n'}
                  {'    '}ef = max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))){'\n'}
                  {'    '}<span className="text-[#bdc2ff]">return</span> interval, n, ef
                </code>
              </pre>
            </div>
          </div>
        </section>

        {/* 02 // Mistake Taxonomy Framework */}
        <section className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div className="font-mono text-xs text-[#4bdcc6] uppercase tracking-widest mb-2">
              02 // Deep Analytics
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl font-bold text-[#F3F4F6] mb-3">
              Mistake Taxonomy Framework
            </h2>
            <p className="font-mono text-xs text-[#8A8F98]">
              Not all mistakes are identical. Categorize your failure modes to systematically strengthen pattern recognition.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#050506] border border-white/[0.08] p-5 rounded-lg hover:border-[#FF375F]/40 transition-colors noise-bg">
              <div className="w-9 h-9 rounded bg-[#FF375F]/10 text-[#FF375F] flex items-center justify-center mb-3">
                <Brain size={18} />
              </div>
              <h3 className="font-headline text-base font-semibold text-[#F3F4F6] mb-1">
                Logic & Pattern Flaw
              </h3>
              <p className="font-mono text-xs text-[#8A8F98] mb-3">
                Misidentified the invariant or selected an incompatible data structure.
              </p>
              <span className="font-mono text-[10px] text-[#FF375F] bg-[#FF375F]/10 border border-[#FF375F]/30 px-2 py-0.5 rounded">
                Penalty: High Reset
              </span>
            </div>

            <div className="bg-[#050506] border border-white/[0.08] p-5 rounded-lg hover:border-[#ffb867]/40 transition-colors noise-bg">
              <div className="w-9 h-9 rounded bg-[#ffb867]/10 text-[#ffb867] flex items-center justify-center mb-3">
                <Cpu size={18} />
              </div>
              <h3 className="font-headline text-base font-semibold text-[#F3F4F6] mb-1">
                Edge Case Miss
              </h3>
              <p className="font-mono text-xs text-[#8A8F98] mb-3">
                Core algorithmic structure was correct, but failed on off-by-one or empty boundary conditions.
              </p>
              <span className="font-mono text-[10px] text-[#ffb867] bg-[#ffb867]/10 border border-[#ffb867]/30 px-2 py-0.5 rounded">
                Penalty: Moderate
              </span>
            </div>

            <div className="bg-[#050506] border border-white/[0.08] p-5 rounded-lg hover:border-[#4bdcc6]/40 transition-colors noise-bg">
              <div className="w-9 h-9 rounded bg-[#4bdcc6]/10 text-[#4bdcc6] flex items-center justify-center mb-3">
                <Layers size={18} />
              </div>
              <h3 className="font-headline text-base font-semibold text-[#F3F4F6] mb-1">
                Syntax / API Slip
              </h3>
              <p className="font-mono text-xs text-[#8A8F98] mb-3">
                Remembered the technique but stumbled on specific language library nuances.
              </p>
              <span className="font-mono text-[10px] text-[#4bdcc6] bg-[#4bdcc6]/10 border border-[#4bdcc6]/30 px-2 py-0.5 rounded">
                Penalty: Minimal
              </span>
            </div>
          </div>
        </section>

        {/* 03 // CTA Banner */}
        <section className="bg-[#0A0A0C] border border-[rgba(94,106,210,0.35)] rounded-xl p-8 sm:p-12 text-center noise-bg relative overflow-hidden shadow-[0_0_30px_rgba(94,106,210,0.08)]">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="font-headline text-2xl sm:text-4xl font-bold text-[#F3F4F6]">
              Deploy Your Algorithm Memory Engine
            </h2>
            <p className="font-mono text-xs text-[#8A8F98] max-w-lg mx-auto">
              Sync your solved problems and automate your morning practice in seconds.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                to={isAuthenticated ? '/dashboard' : '/login'}
                className="bg-[#5e6ad2] text-[#fdfaff] font-mono text-xs font-medium uppercase tracking-[0.06em] px-8 py-3 rounded border-t border-white/20 hover:bg-[#4854bb] hover:shadow-[0_0_20px_rgba(94,106,210,0.4)] transition-all flex items-center gap-2 no-underline"
              >
                <span>Get Started Now</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] bg-[#020203] py-6">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-[#525866]">
          <div className="flex items-center gap-2">
            <span className="text-[#bdc2ff] font-bold">YEAP</span>
            <span>· Your Early AM Practice</span>
          </div>
          <div>v2.4.0-stable · SM-2 Algorithm</div>
        </div>
      </footer>
    </div>
  );
}
