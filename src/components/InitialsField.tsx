import { forwardRef, useState } from 'react';
import { INITIALS_HINT } from '../lib/designs';
import { unsupportedInitials } from '../lib/sanitize';
import { useUiStore } from '../store/ui';

interface Props {
  id: string;
  label: string;
  /** Message to show instead of the hint (e.g. after an empty submit). */
  error?: string | null;
  onEdit?: () => void;
  size?: 'lg' | 'sm';
}

/** The visitor's initials, shared by the opening screen and the gallery. */
export const InitialsField = forwardRef<HTMLInputElement, Props>(function InitialsField({ id, label, error, onEdit, size = 'lg' }, ref) {
  const initials = useUiStore((s) => s.initials);
  const setInitials = useUiStore((s) => s.setInitials);
  const [rejected, setRejected] = useState<string[]>([]);
  const message = error
    ? error
    : rejected.length
      ? `Not supported: ${rejected.map((c) => (c === 'space' ? 'space' : `“${c}”`)).join(', ')}. Use A–Z, 0–9 or &.`
      : INITIALS_HINT;
  const warn = Boolean(error) || rejected.length > 0;

  return (
    <div className={size === 'lg' ? 'space-y-2' : 'space-y-1'}>
      <label htmlFor={id} className={`block font-medium ${size === 'lg' ? 'text-base' : 'text-sm'}`}>
        {label}
      </label>
      <input
        ref={ref}
        id={id}
        type="text"
        value={initials}
        onChange={(e) => {
          setRejected(unsupportedInitials(e.target.value));
          setInitials(e.target.value);
          onEdit?.();
        }}
        aria-describedby={`${id}-hint`}
        aria-invalid={Boolean(error)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize="characters"
        enterKeyHint="go"
        placeholder="AR"
        className={`w-full rounded-xl bg-white font-display font-semibold tracking-[0.12em] uppercase ring-1 ring-ink/20 outline-none transition-shadow duration-150 placeholder:text-ink/25 focus-visible:ring-2 focus-visible:ring-mint-600 aria-invalid:ring-2 aria-invalid:ring-amber-600 dark:bg-stone-900 dark:ring-white/20 dark:placeholder:text-white/25 ${
          size === 'lg' ? 'h-16 px-5 text-4xl' : 'h-12 px-4 text-2xl'
        }`}
      />
      <p
        id={`${id}-hint`}
        role={error ? 'alert' : undefined}
        aria-live={error ? undefined : 'polite'}
        className={`text-sm ${warn ? 'text-amber-800 dark:text-amber-400' : 'text-ink-soft dark:text-stone-400'}`}
      >
        {message}
      </p>
    </div>
  );
});
