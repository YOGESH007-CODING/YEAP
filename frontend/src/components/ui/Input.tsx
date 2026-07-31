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
        <label htmlFor={inputId} className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98]">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          id={inputId}
          type={inputType}
          className={`
            bg-[#0F0F12] border border-white/10 rounded-lg
            px-3 py-2.5 text-sm text-[#EDEDEF] w-full
            placeholder:text-gray-500
            focus:border-[#5E6AD2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] focus:outline-none
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
            className="absolute right-3 text-[#8A8F98] hover:text-[#EDEDEF] transition-colors focus:outline-none"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}
