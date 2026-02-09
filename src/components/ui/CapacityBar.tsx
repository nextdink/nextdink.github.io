interface CapacityBarProps {
  current: number;
  max: number;
  className?: string;
  showText?: boolean;
}

export function CapacityBar({ current, max, className = '', showText = true }: CapacityBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isFull = current >= max;
  
  return (
    <div className={className}>
      <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isFull ? 'bg-amber-500' : 'bg-primary-600 dark:bg-primary-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showText && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {current} / {max} spots filled
          {isFull && <span className="text-amber-600 dark:text-amber-400 ml-2">(Full)</span>}
        </p>
      )}
    </div>
  );
}