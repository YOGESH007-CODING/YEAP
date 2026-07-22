import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="font-mono text-[10px] font-medium uppercase tracking-widest text-[#8A8F98]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          bg-[#0F0F12] border border-white/10 rounded-lg
          px-3 py-2.5 text-sm text-[#EDEDEF]
          placeholder:text-gray-500
          focus:border-[#5E6AD2] focus:shadow-[0_0_0_3px_rgba(94,106,210,0.15)] focus:outline-none
          transition-all duration-200
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
