interface Props {
  value: number; // 0-100
  label?: string;
  showPercent?: boolean;
}

export default function ProgressBar({ value, label, showPercent = true }: Props) {
  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-xs text-slate-400">{label}</span>}
          {showPercent && <span className="text-xs font-medium text-emerald-400 tabular-nums">{Math.round(value)}%</span>}
        </div>
      )}
      <div className="w-full h-2 bg-white/[0.04] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
