import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../lib/auth';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
];

export function Header() {
  const { pathname } = useLocation();
  const { signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/80 backdrop-blur-xl">
      <div className="mx-auto max-w-screen-xl flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/dashboard" className="text-lg font-semibold tracking-tight text-[#EDEDEF] no-underline flex items-center gap-2">
          <span className="inline-block w-6 h-6 rounded-lg bg-[#5E6AD2] shadow-[0_0_12px_rgba(94,106,210,0.4)]" />
          YEAP
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`
                text-sm font-medium px-3 py-1.5 rounded-lg transition-all duration-200 no-underline
                ${pathname === to
                  ? 'bg-white/[0.08] text-[#EDEDEF]'
                  : 'text-[#8A8F98] hover:text-[#EDEDEF] hover:bg-white/[0.05]'
                }
              `}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={signOut}
            className="text-sm font-medium px-3 py-1.5 rounded-lg text-[#8A8F98] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer ml-2"
          >
            Sign Out
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-[#8A8F98] hover:text-[#EDEDEF] cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-white/[0.06] bg-[#050506]/95 backdrop-blur-xl px-4 py-3 space-y-1">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`
                block text-sm font-medium px-3 py-2 rounded-lg transition-all duration-200 no-underline
                ${pathname === to ? 'bg-white/[0.08] text-[#EDEDEF]' : 'text-[#8A8F98]'}
              `}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => { signOut(); setMobileOpen(false); }}
            className="block w-full text-left text-sm font-medium px-3 py-2 rounded-lg text-[#8A8F98] hover:text-red-400 cursor-pointer"
          >
            Sign Out
          </button>
        </nav>
      )}
    </header>
  );
}
