import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-[#5e6ad2] text-[#fdfaff] border-t border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-[#4854bb] hover:shadow-[0_0_15px_rgba(94,106,210,0.4)] active:scale-[0.98]',
  secondary:
    'border border-white/[0.08] bg-[#0A0A0C] text-[#F3F4F6] hover:bg-[#121217] hover:border-[#bdc2ff]/40 active:scale-[0.98]',
  ghost:
    'bg-transparent text-[#8A8F98] hover:bg-[#121217] hover:text-[#F3F4F6]',
  danger:
    'bg-[#FF375F]/10 text-[#FF375F] border border-[#FF375F]/30 hover:bg-[#FF375F]/20 active:scale-[0.98]',
};

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        rounded px-4 py-2 font-mono text-[12px] font-medium uppercase tracking-[0.04em]
        transition-all duration-200 ease-out cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
        ${styles[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
