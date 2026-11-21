interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: (on: boolean) => void;
  disabled?: boolean;
  hint?: string;
}

export function Switch({ label, checked, onChange, disabled = false, hint }: SwitchProps) {
  return (
    <label className={`flex items-center justify-between gap-3 text-sm ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span>
        {label}
        {hint && <span className="block text-xs text-stone-600 dark:text-stone-400">{hint}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition-colors duration-150 peer-checked:bg-emerald-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-5 dark:bg-stone-600"
      />
    </label>
  );
}
