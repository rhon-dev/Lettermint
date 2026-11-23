import { useId } from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (n: number) => void;
  format: (n: number) => string;
  disabled?: boolean;
  hint?: string;
}

export function Slider({ label, value, min, max, step, onChange, format, disabled = false, hint }: SliderProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div className={`space-y-2 ${disabled ? 'opacity-60' : ''}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
        </label>
        <output htmlFor={id} className="font-mono text-sm text-stone-700 tabular-nums dark:text-stone-300">
          {format(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={format(value)}
        aria-describedby={hint ? hintId : undefined}
        onChange={(e) => onChange(Number(e.target.value))}
        className="focus-ring h-6 w-full cursor-pointer rounded-full disabled:cursor-not-allowed [@media(pointer:coarse)]:h-11"
      />
      {hint && (
        <p id={hintId} className="text-xs text-stone-600 dark:text-stone-400">
          {hint}
        </p>
      )}
    </div>
  );
}
