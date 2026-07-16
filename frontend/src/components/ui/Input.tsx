import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="font-data text-[10px] font-medium uppercase tracking-widest text-[#737373]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          font-data border-b-2 border-[#111] bg-transparent
          px-1 py-2 text-sm text-[#111]
          placeholder:text-[#A3A3A3]
          focus:bg-[#F0F0F0] focus:outline-none
          transition-colors duration-200
          ${className}
        `}
        {...props}
      />
    </div>
  );
}
