import { useLogoStore } from '../store/logo';

export function TextInput() {
  const text = useLogoStore((s) => s.text);
  const uppercase = useLogoStore((s) => s.uppercase);
  const setText = useLogoStore((s) => s.setText);
  const setUppercase = useLogoStore((s) => s.setUppercase);

  return (
    <div className="space-y-3">
      <label htmlFor="initials" className="block text-sm font-medium">
        Initials
      </label>
      <input
        id="initials"
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby="initials-hint"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        autoCapitalize={uppercase ? 'characters' : 'off'}
        style={{ textTransform: uppercase ? 'uppercase' : 'none' }}
        className="focus-ring w-full rounded-xl bg-stone-100 px-4 py-3 text-3xl font-semibold tracking-wide ring-1 ring-stone-200 transition-shadow duration-150 dark:bg-stone-800 dark:ring-stone-700"
      />
      <p id="initials-hint" className="text-xs text-stone-600 dark:text-stone-400">
        1–2 characters: letters, numbers or &amp;
      </p>
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        <span>Auto-uppercase</span>
        <input
          type="checkbox"
          role="switch"
          checked={uppercase}
          onChange={(e) => setUppercase(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="relative h-6 w-11 shrink-0 rounded-full bg-stone-300 transition-colors duration-150 peer-checked:bg-emerald-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:duration-150 peer-checked:after:translate-x-5 dark:bg-stone-600"
        />
      </label>
    </div>
  );
}
