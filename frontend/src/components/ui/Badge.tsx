type BadgeVariant = 'easy' | 'medium' | 'hard' | 'default' | 'accent' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  easy:    'border-green-500/30 text-green-400 bg-green-500/10',
  medium:  'border-yellow-500/30 text-yellow-400 bg-yellow-500/10',
  hard:    'border-red-500/30 text-red-400 bg-red-500/10',
  default: 'border-white/10 text-[#EDEDEF] bg-white/5',
  accent:  'border-[#5E6AD2]/30 text-[#5E6AD2] bg-[#5E6AD2]/10',
  muted:   'border-white/6 text-[#8A8F98] bg-white/[0.03]',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`font-mono inline-block border rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const v = difficulty === 'EASY' ? 'easy' : difficulty === 'MEDIUM' ? 'medium' : 'hard';
  return <Badge variant={v}>{difficulty}</Badge>;
}
