import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#8A8F98] transition-all duration-200 hover:bg-white/[0.05] hover:text-[#EDEDEF]"
      aria-label={`Switch to ${nextTheme} theme`}
      title={`Switch to ${nextTheme} theme`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
