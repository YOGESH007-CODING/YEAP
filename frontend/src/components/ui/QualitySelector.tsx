import { useState } from 'react';

interface QualitySelectorProps {
  value: number | null;
  onChange: (score: number) => void;
}

const scores = [
  { score: 0, label: 'Blackout',  desc: 'Complete blackout. Couldn\'t recall anything.',  color: 'border-red-600 text-red-700' },
  { score: 1, label: 'Fail',      desc: 'Incorrect, but recognized the solution when shown.', color: 'border-orange-500 text-orange-600' },
  { score: 2, label: 'Hard Fail', desc: 'Incorrect, but it felt familiar.',               color: 'border-yellow-500 text-yellow-600' },
  { score: 3, label: 'Struggled', desc: 'Correct, but it took serious effort.',           color: 'border-blue-500 text-blue-600' },
  { score: 4, label: 'Good',      desc: 'Correct with some hesitation.',                  color: 'border-green-500 text-green-600' },
  { score: 5, label: 'Perfect',   desc: 'Perfect recall. Solved it immediately.',         color: 'border-[#111] text-[#111]' },
];

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
  const [hoveredScore, setHoveredScore] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0">
      {scores.map(({ score, label, desc, color }, i) => {
        const isSelected = value === score;
        const isHovered = hoveredScore === score;

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            onMouseEnter={() => setHoveredScore(score)}
            onMouseLeave={() => setHoveredScore(null)}
            className={`
              border border-[#111] p-4 text-left transition-all duration-200 cursor-pointer
              min-h-[100px] flex flex-col justify-between
              ${i > 0 ? 'border-l-0 max-md:border-l' : ''}
              ${i >= 2 ? 'max-md:border-t-0' : ''}
              ${i >= 3 ? 'max-lg:border-t-0' : ''}
              ${isSelected
                ? 'bg-[#111] text-[#F9F9F7]'
                : isHovered
                  ? 'bg-[#F5F5F5]'
                  : 'bg-[#F9F9F7]'
              }
            `}
          >
            <div className="flex items-baseline gap-2">
              <span className={`font-display text-2xl font-bold ${isSelected ? 'text-[#F9F9F7]' : color}`}>
                {score}
              </span>
              <span className={`font-ui text-xs font-semibold uppercase tracking-widest ${isSelected ? 'text-[#F9F9F7]' : ''}`}>
                {label}
              </span>
            </div>
            <p className={`font-body text-xs mt-2 leading-snug ${isSelected ? 'text-[#A3A3A3]' : 'text-[#737373]'}`}>
              {desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
