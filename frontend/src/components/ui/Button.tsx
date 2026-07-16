import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#111] text-[#F9F9F7] border border-transparent hover:bg-[#F9F9F7] hover:text-[#111] hover:border-[#111]',
  secondary:
    'border border-[#111] bg-transparent text-[#111] hover:bg-[#111] hover:text-[#F9F9F7]',
  ghost:
    'bg-transparent text-[#111] hover:bg-[#E5E5E0]',
  link:
    'bg-transparent text-[#111] underline-offset-4 decoration-2 decoration-[#CC0000] hover:underline p-0 min-h-0',
  danger:
    'bg-[#CC0000] text-white border border-transparent hover:bg-white hover:text-[#CC0000] hover:border-[#CC0000]',
};

export function Button({ variant = 'primary', fullWidth, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        font-ui inline-flex items-center justify-center gap-2
        px-6 py-3 text-xs font-semibold uppercase tracking-widest
        transition-all duration-200 ease-out
        min-h-[44px] cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
