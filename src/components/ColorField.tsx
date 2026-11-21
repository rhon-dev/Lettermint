import { useState } from 'react';
import { parseHex } from '../lib/color';

interface ColorFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

export function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  // While the user edits the hex text, keep their draft; otherwise mirror the store.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value.toUpperCase();
  const invalid = draft !== null && parseHex(draft) === null;
  const hintId = `${id}-hint`;

  return (
    <div className="space-y-2">
      <label htmlFor={`${id}-hex`} className="block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={value}
          onChange={(e) => {
            setDraft(null);
            onChange(e.target.value);
          }}
          className="focus-ring h-11 w-14 shrink-0 cursor-pointer rounded-xl bg-transparent p-1 ring-1 ring-stone-200 dark:ring-stone-700"
        />
        <input
          id={`${id}-hex`}
          type="text"
          inputMode="text"
          value={shown}
          maxLength={7}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
          aria-describedby={hintId}
          onChange={(e) => {
            const next = e.target.value;
            setDraft(next);
            const parsed = parseHex(next);
            if (parsed) onChange(parsed);
          }}
          onBlur={() => setDraft(null)}
          className={`focus-ring h-11 w-full min-w-0 rounded-xl bg-stone-100 px-3 font-mono text-sm uppercase ring-1 transition-shadow duration-150 dark:bg-stone-800 ${
            invalid ? 'ring-amber-500' : 'ring-stone-200 dark:ring-stone-700'
          }`}
        />
      </div>
      <p id={hintId} className={`text-xs ${invalid ? 'text-amber-700 dark:text-amber-400' : 'sr-only'}`}>
        Use #RGB or #RRGGBB
      </p>
    </div>
  );
}
