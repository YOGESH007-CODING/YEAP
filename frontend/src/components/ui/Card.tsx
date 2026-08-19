import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  accent?: boolean;
}

export function Card({ children, hoverable, accent, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        rounded-lg border border-white/[0.08] bg-[#050506] noise-bg relative
        ${hoverable ? 'cursor-pointer transition-all duration-200 hover:border-white/[0.2] hover:bg-[#0A0A0C]' : ''}
        ${accent ? 'border-[#5E6AD2]/30 shadow-[0_0_20px_rgba(94,106,210,0.06)]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
