interface ProgressBarProps {
  percent: number;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ percent, showLabel = false, size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color = clamped >= 100 ? 'bg-emerald-500' : clamped >= 60 ? 'bg-primary-600' : 'bg-primary-400';

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 ${size === 'sm' ? 'h-1.5' : 'h-2.5'}`}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      {showLabel && (
        <span className="w-12 shrink-0 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
          {clamped}%
        </span>
      )}
    </div>
  );
}
