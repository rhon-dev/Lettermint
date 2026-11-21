import { useMemo } from 'react';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { useCurrentMark } from '../hooks/useCurrentMark';
import { useUiStore, type Backdrop } from '../store/ui';
import { LogoMark } from './LogoMark';

const BACKDROPS: { id: Backdrop; label: string; swatch: string }[] = [
  { id: 'checker', label: 'Transparent', swatch: 'checkerboard' },
  { id: 'light', label: 'Light', swatch: 'bg-white' },
  { id: 'dark', label: 'Dark', swatch: 'bg-stone-950' },
];

const BACKDROP_CLASS: Record<Backdrop, string> = {
  checker: 'checkerboard',
  light: 'bg-white',
  dark: 'bg-stone-950',
};

export function Preview({ className = '', showSize = true }: { className?: string; showSize?: boolean }) {
  const { state, font, family } = useCurrentMark();
  const backdrop = useUiStore((s) => s.backdrop);
  const setBackdrop = useUiStore((s) => s.setBackdrop);
  const geo = useMemo(() => buildLogo(state, font), [state, font]);

  return (
    <section
      aria-label="Preview"
      className={`${BACKDROP_CLASS[backdrop]} relative flex min-h-0 items-center justify-center overflow-hidden rounded-[1.25rem] ring-1 ring-black/5 transition-colors duration-200 dark:ring-white/10 ${className}`}
    >
      <LogoMark
        state={state}
        font={font}
        geometry={geo}
        label={describeLogo(state, family)}
        className="h-full max-h-full w-full max-w-full p-6 drop-shadow-[0_18px_40px_rgba(0,0,0,0.18)] sm:p-12"
      />
      <div
        role="radiogroup"
        aria-label="Preview backdrop"
        className="absolute top-3 left-3 flex gap-1 rounded-full bg-white/80 p-1 shadow-sm ring-1 ring-black/5 backdrop-blur dark:bg-stone-900/80 dark:ring-white/10"
      >
        {BACKDROPS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={backdrop === b.id}
            aria-label={`${b.label} backdrop`}
            title={`${b.label} backdrop`}
            onClick={() => setBackdrop(b.id)}
            className="focus-ring grid h-8 w-8 cursor-pointer place-items-center rounded-full transition-transform duration-150 active:scale-95"
          >
            <span
              className={`h-5 w-5 rounded-full ring-1 ring-black/15 dark:ring-white/20 ${b.swatch} ${
                backdrop === b.id ? 'outline-2 outline-offset-2 outline-mint-500' : ''
              }`}
            />
          </button>
        ))}
      </div>
      {showSize && (
        <p className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 font-mono text-xs text-stone-700 tabular-nums ring-1 ring-black/5 backdrop-blur dark:bg-stone-900/85 dark:text-stone-300 dark:ring-white/10">
          {state.size} × {state.size} px
        </p>
      )}
    </section>
  );
}
