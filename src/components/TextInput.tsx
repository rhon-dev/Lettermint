import { useState } from 'react';
import { unsupportedInitials } from '../lib/sanitize';
import { Switch } from './Switch';
import { useLogoStore } from '../store/logo';

export function TextInput() {
  const text = useLogoStore((s) => s.text);
  const uppercase = useLogoStore((s) => s.uppercase);
  const setText = useLogoStore((s) => s.setText);
  const setUppercase = useLogoStore((s) => s.setUppercase);
  const [rejected, setRejected] = useState<string[]>([]);

  return (
    <div className="space-y-3">
      <label htmlFor="initials" className="block text-sm font-medium">
        Initials
      </label>
      <input
        id="initials"
        type="text"
        value={text}
        onChange={(e) => {
          setRejected(unsupportedInitials(e.target.value));
          setText(e.target.value);
        }}
        aria-describedby="initials-hint"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize={uppercase ? 'characters' : 'off'}
        style={{ textTransform: uppercase ? 'uppercase' : 'none' }}
        className="focus-ring w-full rounded-xl bg-stone-100 px-4 py-3 text-3xl font-semibold tracking-wide ring-1 ring-stone-200 transition-shadow duration-150 dark:bg-stone-800 dark:ring-stone-700"
      />
      <p
        id="initials-hint"
        aria-live="polite"
        className={`text-xs ${rejected.length ? 'text-amber-700 dark:text-amber-400' : 'text-stone-600 dark:text-stone-400'}`}
      >
        {rejected.length
          ? `Not supported: ${rejected.map((c) => (c === 'space' ? 'space' : `“${c}”`)).join(', ')}. Use A–Z, 0–9 or &.`
          : '1–2 characters: letters, numbers or &'}
      </p>
      <Switch label="Auto-uppercase" checked={uppercase} onChange={setUppercase} />
    </div>
  );
}
