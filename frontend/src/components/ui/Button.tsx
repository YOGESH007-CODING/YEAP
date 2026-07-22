import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const styles: Record<Variant, string> = {
  primary:
    'bg-[#5E6AD2] text-white shadow-[0_0_0_1px_rgba(94,106,210,0.5),0_4px_12px_rgba(94,106,210,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)] hover:bg-[#6872D9] hover:shadow-[0_0_0_1px_rgba(94,106,210,0.6),0_8px_24px_rgba(94,106,210,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.98]',
  secondary:
    'bg-white/[0.05] text-[#EDEDEF] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] hover:bg-white/[0.08] active:scale-[0.98]',
  ghost:
    'bg-transparent text-[#8A8F98] hover:bg-white/[0.05] hover:text-[#EDEDEF]',
  danger:
    'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 active:scale-[0.98]',
};

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        px-5 py-2.5 text-sm font-medium rounded-lg
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
