type BadgeVariant = 'easy' | 'medium' | 'hard' | 'default' | 'red' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  easy:    'border-green-700 text-green-700 bg-green-50',
  medium:  'border-yellow-600 text-yellow-700 bg-yellow-50',
  hard:    'border-[#CC0000] text-[#CC0000] bg-red-50',
  default: 'border-[#111] text-[#111]',
  red:     'bg-[#CC0000] text-white border-[#CC0000]',
  muted:   'border-[#E5E5E0] text-[#737373] bg-[#F5F5F5]',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        font-data inline-block border px-2 py-0.5
        text-[10px] font-medium uppercase tracking-widest
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

/** Maps difficulty string to badge variant. */
export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === 'EASY' ? 'easy' : difficulty === 'MEDIUM' ? 'medium' : 'hard';
  return <Badge variant={variant}>{difficulty}</Badge>;
}
