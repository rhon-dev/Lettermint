import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { getFontDef } from '../fonts/registry';
import { buildLogo } from '../lib/buildLogo';
import { describeLogo } from '../lib/describe';
import { useFontStore } from '../lib/glyphs';
import { useLogoStore } from '../store/logo';

export function Preview({ className = '', showSize = true }: { className?: string; showSize?: boolean }) {
  const state = useLogoStore(
    useShallow((s) => ({
      text: s.text,
      uppercase: s.uppercase,
      shape: s.shape,
      size: s.size,
      scale: s.scale,
      spacing: s.spacing,
      bgColor: s.bgColor,
      fgColor: s.fgColor,
      fontId: s.fontId,
    })),
  );
  const activeId = useFontStore((s) => s.activeId);
  const font = useFontStore((s) => (s.activeId ? (s.fonts[s.activeId] ?? null) : null));
  const geo = useMemo(() => buildLogo(state, font), [state, font]);
  const family = getFontDef(activeId ?? state.fontId).family;

  return (
    <section
      aria-label="Preview"
      className={`checkerboard relative flex min-h-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-800 ${className}`}
    >
      <svg
        viewBox={geo.viewBox}
        role="img"
        aria-label={describeLogo(state, family)}
        className="h-full max-h-full w-full max-w-full p-4 sm:p-8"
      >
        <path d={geo.shapePath} fill={state.bgColor} className="transition-[fill] duration-150" />
        {geo.glyphPath && (
          <path
            d={geo.glyphPath}
            fill={state.fgColor}
            opacity={geo.placeholder ? 0.28 : 1}
            className="transition-[fill] duration-150"
          />
        )}
      </svg>
      {showSize && (
      <p className="pointer-events-none absolute right-3 bottom-3 rounded-full bg-white/85 px-2.5 py-1 font-mono text-xs text-stone-700 tabular-nums ring-1 ring-stone-200 dark:bg-stone-900/85 dark:text-stone-300 dark:ring-stone-700">
        {state.size} × {state.size} px
      </p>
      )}
    </section>
  );
}
