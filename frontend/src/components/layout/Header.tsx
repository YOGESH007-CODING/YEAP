import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, Database, GitBranch, Settings, Menu, X, LogOut, BookOpen, HelpCircle, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { ThemeToggle } from '../ui/ThemeToggle';
import { api } from '../../lib/api';

const navLinks = [
  { to: '/dashboard', label: 'Command Center', icon: Terminal, matchExact: true },
  { to: '/history', label: 'Problem Lab', icon: Database },
  { to: '/dashboard', label: 'Review Stream', icon: GitBranch, isReview: true },
  { to: '/settings', label: 'System Config', icon: Settings },
];

export function Header() {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const handleQuickSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await api.post('/api/review/sync');
      setSyncMsg('Synced!');
      setTimeout(() => setSyncMsg(null), 3000);
      if (pathname === '/dashboard') {
        window.location.reload();
      } else {
        navigate('/dashboard');
      }
    } catch {
      setSyncMsg('Sync failed');
      setTimeout(() => setSyncMsg(null), 3000);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 h-14 z-50 bg-[#050506]/90 backdrop-blur-md border-b border-white/[0.08] flex items-center justify-between px-4">
        <Link to="/dashboard" className="font-mono text-xl font-semibold tracking-tight text-[#bdc2ff] no-underline">
          YEAP
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-1.5 text-[#8A8F98] hover:text-[#F3F4F6] transition-colors rounded"
            aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Desktop & Mobile Drawer Side Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-[#020203] border-r border-white/[0.08] py-6 transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & User Header */}
        <div className="px-5 mb-6">
          <Link to="/dashboard" className="flex items-center gap-3 no-underline group" onClick={() => setMobileOpen(false)}>
            <span className="font-mono text-2xl font-bold tracking-tight text-[#bdc2ff] group-hover:text-white transition-colors">
              YEAP
            </span>
            <div className="flex flex-col border-l border-white/[0.1] pl-3">
              <span className="font-headline text-xs font-semibold text-[#F3F4F6] truncate max-w-[130px]">
                {user?.name || 'Early AM Session'}
              </span>
              <span className="font-mono text-[10px] text-[#525866] tracking-wider">
                v2.4.0-stable
              </span>
            </div>
          </Link>

          {/* Quick Action Sync Button */}
          <button
            onClick={handleQuickSync}
            disabled={syncing}
            className="mt-5 w-full bg-[#5e6ad2] text-[#fdfaff] py-2 px-3 rounded font-mono text-[11px] font-medium uppercase tracking-[0.04em] border-t border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)] hover:bg-[#4854bb] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : syncMsg || 'Sync LeetCode'}</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 flex flex-col gap-1 px-0">
          {navLinks.map(({ to, label, icon: Icon, isReview, matchExact }) => {
            const active = matchExact ? pathname === to : pathname.startsWith(to) && !isReview;
            return (
              <Link
                key={`${to}-${label}`}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-5 py-2.5 font-mono text-[11px] font-medium tracking-[0.04em] no-underline transition-all border-l-2 ${
                  active
                    ? 'border-[#bdc2ff] bg-[#121217] text-[#bdc2ff]'
                    : 'border-transparent text-[#525866] hover:bg-[#0A0A0C] hover:text-[#F3F4F6]'
                }`}
              >
                <Icon size={16} strokeWidth={1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Utility Area */}
        <div className="mt-auto px-5 pt-4 border-t border-white/[0.08] flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs py-1">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#525866] hover:text-[#F3F4F6] flex items-center gap-2 font-mono text-[11px] no-underline transition-colors"
            >
              <BookOpen size={14} />
              <span>Docs</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#525866] hover:text-[#F3F4F6] flex items-center gap-2 font-mono text-[11px] no-underline transition-colors"
            >
              <HelpCircle size={14} />
              <span>Support</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
            <span className="font-mono text-[10px] uppercase tracking-wider text-[#525866]">Appearance</span>
            <ThemeToggle />
          </div>

          <button
            onClick={() => { signOut(); setMobileOpen(false); }}
            className="w-full mt-1 flex items-center gap-2.5 py-2 text-left font-mono text-[11px] uppercase tracking-wider text-[#525866] hover:text-[#FF375F] transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm lg:hidden cursor-default"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}
    </>
  );
}
