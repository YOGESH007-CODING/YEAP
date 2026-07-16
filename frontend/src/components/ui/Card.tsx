import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
  inverted?: boolean;
}

export function Card({ children, hoverable, inverted, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        border border-[#111] p-6
        ${inverted ? 'bg-[#111] text-[#F9F9F7]' : 'bg-[#F9F9F7] text-[#111]'}
        ${hoverable ? 'hard-shadow-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
