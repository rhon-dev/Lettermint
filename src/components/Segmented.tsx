import type { ReactNode } from 'react';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

interface SegmentedProps<T extends string | number> {
  legend: string;
  name: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Show the legend visually (default: screen readers only). */
  showLegend?: boolean;
}

/** Radio group styled as a segmented control (keyboard: arrow keys, via native radios). */
export function Segmented<T extends string | number>({ legend, name, options, value, onChange, showLegend = false }: SegmentedProps<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className={showLegend ? 'mb-2 text-sm font-medium' : 'sr-only'}>{legend}</legend>
      <div className="chip grid gap-1 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <label key={o.value} className={o.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} title={o.title}>
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              disabled={o.disabled}
              onChange={() => onChange(o.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-10 items-center justify-center gap-2 rounded-[0.7rem] px-1 text-center text-sm text-stone-600 transition-colors duration-150 peer-checked:bg-white peer-checked:text-stone-900 peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-mint-500 peer-disabled:opacity-40 dark:text-stone-400 dark:peer-checked:bg-stone-950 dark:peer-checked:text-stone-100">
              {o.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
