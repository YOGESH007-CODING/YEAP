import { useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, type, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-[#8A8F98]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          type={inputType}
          className={`
            w-full bg-[#0A0A0C] border border-white/[0.08] rounded
            px-3 py-2.5 font-mono text-sm text-[#F3F4F6]
            placeholder:text-[#525866]
            focus:border-[rgba(94,106,210,0.5)] focus:shadow-[0_0_0_1px_rgba(94,106,210,0.35)] focus:outline-none
            transition-all duration-200
            ${isPassword ? 'pr-10' : ''}
            ${className}
          `}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 text-[#8A8F98] hover:text-[#F3F4F6] transition-colors focus:outline-none cursor-pointer"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
