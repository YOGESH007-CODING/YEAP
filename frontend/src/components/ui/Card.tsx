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
        bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl
        border border-white/[0.06]
        shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_2px_20px_rgba(0,0,0,0.4)]
        ${hoverable ? 'transition-all duration-200 ease-out cursor-pointer hover:border-white/[0.10] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(94,106,210,0.08)] hover:-translate-y-1' : ''}
        ${accent ? 'border-[#5E6AD2]/30' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
