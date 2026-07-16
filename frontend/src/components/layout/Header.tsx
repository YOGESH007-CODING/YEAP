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

  const today = new Date();
  const formatted = today.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="sticky top-0 z-40 bg-[#F9F9F7] border-b-4 border-[#111]">
      {/* Edition bar */}
      <div className="border-b border-[#E5E5E0] px-4">
        <div className="mx-auto max-w-screen-xl flex items-center justify-between py-1">
          <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">
            Vol. 1 &nbsp;|&nbsp; {formatted}
          </span>
          <span className="font-data text-[10px] uppercase tracking-widest text-[#737373]">
            Spaced Repetition Edition
          </span>
        </div>
      </div>

      {/* Main header */}
      <div className="px-4">
        <div className="mx-auto max-w-screen-xl flex items-center justify-between py-3">
          {/* Masthead */}
          <Link to="/dashboard" className="font-display text-3xl lg:text-4xl font-black tracking-tight text-[#111] no-underline">
            YEAP
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            {navLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`
                  font-ui text-xs font-semibold uppercase tracking-widest
                  px-4 py-2 transition-colors duration-200 no-underline
                  ${pathname === to
                    ? 'bg-[#111] text-[#F9F9F7]'
                    : 'text-[#111] hover:text-[#CC0000]'
                  }
                `}
              >
                {label}
              </Link>
            ))}
            <button
              onClick={signOut}
              className="font-ui text-xs font-semibold uppercase tracking-widest px-4 py-2 text-[#737373] hover:text-[#CC0000] transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-[#111] bg-[#F9F9F7]" aria-label="Mobile navigation">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`
                block px-4 py-3 font-ui text-xs font-semibold uppercase tracking-widest
                border-b border-[#E5E5E0] no-underline
                ${pathname === to ? 'bg-[#111] text-[#F9F9F7]' : 'text-[#111]'}
              `}
            >
              {label}
            </Link>
          ))}
          <button
            onClick={() => { signOut(); setMobileOpen(false); }}
            className="block w-full text-left px-4 py-3 font-ui text-xs font-semibold uppercase tracking-widest text-[#737373] cursor-pointer"
          >
            Sign Out
          </button>
        </nav>
      )}
    </header>
  );
}
