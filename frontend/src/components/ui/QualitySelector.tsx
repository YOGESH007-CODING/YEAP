import { useState } from 'react';

interface QualitySelectorProps {
  value: number | null;
  onChange: (score: number) => void;
}

const scores = [
  { score: 0, label: 'Blackout',  desc: 'Complete blackout.',           color: 'text-red-400' },
  { score: 1, label: 'Fail',      desc: 'Incorrect, but recognized.',   color: 'text-orange-400' },
  { score: 2, label: 'Hard Fail', desc: 'Incorrect, felt familiar.',    color: 'text-yellow-400' },
  { score: 3, label: 'Struggled', desc: 'Correct, serious effort.',     color: 'text-blue-400' },
  { score: 4, label: 'Good',      desc: 'Correct, some hesitation.',    color: 'text-green-400' },
  { score: 5, label: 'Perfect',   desc: 'Perfect recall.',              color: 'text-[#5E6AD2]' },
];

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {scores.map(({ score, label, desc, color }) => {
        const selected = value === score;
        const isHovered = hovered === score;

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            onMouseEnter={() => setHovered(score)}
            onMouseLeave={() => setHovered(null)}
            className={`
              rounded-xl p-4 text-left transition-all duration-200 ease-out cursor-pointer
              min-h-[100px] flex flex-col justify-between border
              ${selected
                ? 'bg-[#5E6AD2]/20 border-[#5E6AD2]/50 shadow-[0_0_20px_rgba(94,106,210,0.2)]'
                : isHovered
                  ? 'bg-white/[0.06] border-white/[0.10]'
                  : 'bg-white/[0.03] border-white/[0.06]'
              }
            `}
          >
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-semibold ${selected ? 'text-[#5E6AD2]' : color}`}>{score}</span>
              <span className={`text-xs font-medium tracking-wide ${selected ? 'text-[#EDEDEF]' : 'text-[#8A8F98]'}`}>{label}</span>
            </div>
            <p className={`text-[11px] mt-2 leading-snug ${selected ? 'text-white/60' : 'text-white/40'}`}>{desc}</p>
          </button>
        );
      })}
    </div>
  );
}
