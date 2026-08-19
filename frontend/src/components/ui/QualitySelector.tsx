interface QualitySelectorProps {
  value: number | null;
  onChange: (score: number) => void;
}

const grades = [
  { score: 0, label: 'Blackout', shortcut: '[1]', hoverBorder: 'hover:border-[#FF375F]/50', hoverBg: 'hover:bg-[#FF375F]/5', activeColor: 'text-[#FF375F]', ring: 'border-[#FF375F]/50 bg-[#FF375F]/10' },
  { score: 1, label: 'Wrong',    shortcut: '[2]', hoverBorder: 'hover:border-[#FF375F]/50', hoverBg: 'hover:bg-[#FF375F]/5', activeColor: 'text-[#FF375F]', ring: 'border-[#FF375F]/50 bg-[#FF375F]/10' },
  { score: 2, label: 'Struggle', shortcut: '[3]', hoverBorder: 'hover:border-[#ffb867]/50', hoverBg: 'hover:bg-[#ffb867]/5', activeColor: 'text-[#ffb867]', ring: 'border-[#ffb867]/50 bg-[#ffb867]/10' },
  { score: 3, label: 'Clunky',   shortcut: '[4]', hoverBorder: 'hover:border-[#ffb867]/50', hoverBg: 'hover:bg-[#ffb867]/5', activeColor: 'text-[#ffb867]', ring: 'border-[#ffb867]/50 bg-[#ffb867]/10' },
  { score: 4, label: 'Good',     shortcut: '[5]', hoverBorder: 'hover:border-[#4bdcc6]/50', hoverBg: 'hover:bg-[#4bdcc6]/5', activeColor: 'text-[#4bdcc6]', ring: 'border-[#4bdcc6]/50 bg-[#4bdcc6]/10' },
  { score: 5, label: 'Perfect',  shortcut: '[6]', hoverBorder: 'hover:border-[#bdc2ff]/50', hoverBg: 'hover:bg-[#5e6ad2]/10', activeColor: 'text-[#bdc2ff]', ring: 'border-[#bdc2ff] bg-[#5e6ad2]/15', isHero: true },
];

export function QualitySelector({ value, onChange }: QualitySelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
      {grades.map(({ score, label, shortcut, hoverBorder, hoverBg, activeColor, ring, isHero }) => {
        const selected = value === score;

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`
              flex flex-col items-center justify-center p-4 rounded border transition-all duration-200 cursor-pointer group relative overflow-hidden
              ${selected
                ? `${ring} text-[#F3F4F6]`
                : `border-white/[0.08] bg-[#050506] ${hoverBorder} ${hoverBg}`
              }
            `}
          >
            {isHero && (
              <div className={`absolute inset-0 bg-radial from-[rgba(94,106,210,0.25)] to-transparent blur-[14px] pointer-events-none transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
            )}
            <span className={`font-mono text-2xl font-semibold mb-1 relative z-10 transition-colors ${selected ? activeColor : 'text-[#525866] group-hover:text-[#F3F4F6]'}`}>
              {score}
            </span>
            <span className={`font-mono text-[11px] text-center relative z-10 transition-colors ${selected ? 'text-[#F3F4F6] font-medium' : 'text-[#8A8F98] group-hover:text-[#F3F4F6]'}`}>
              {label}
            </span>
            <span className="font-mono text-[10px] text-[#525866] mt-2 opacity-60 relative z-10">
              {shortcut}
            </span>
          </button>
        );
      })}
    </div>
  );
}
