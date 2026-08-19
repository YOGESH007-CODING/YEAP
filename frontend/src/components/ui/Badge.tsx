type BadgeVariant = 'easy' | 'medium' | 'hard' | 'default' | 'accent' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const styles: Record<BadgeVariant, string> = {
  easy:    'border-[#4bdcc6]/30 text-[#4bdcc6] bg-[#4bdcc6]/10',
  medium:  'border-[#ffb867]/30 text-[#ffb867] bg-[#ffb867]/10',
  hard:    'border-[#FF375F]/30 text-[#FF375F] bg-[#FF375F]/10',
  default: 'border-white/[0.08] text-[#F3F4F6] bg-[#201f22]',
  accent:  'border-[#5E6AD2]/30 text-[#bdc2ff] bg-[#5E6AD2]/10',
  muted:   'border-white/[0.08] text-[#525866] bg-[#201f22]',
};

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span className={`font-mono inline-block border rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const normalized = difficulty.toUpperCase();
  const v = normalized === 'EASY' ? 'easy' : normalized === 'MEDIUM' || normalized === 'MED' ? 'medium' : 'hard';
  return <Badge variant={v}>{difficulty}</Badge>;
}
