import { useEffect, useMemo, useRef } from 'react';
import type { Font } from 'opentype.js';
import { FONTS } from '../fonts/registry';
import { buildLogo } from '../lib/buildLogo';
import { requestFont, useFontStore } from '../lib/glyphs';
import { displayText } from '../lib/sanitize';
import { useLogoStore } from '../store/logo';

function TileGlyphs({ font, text }: { font: Font; text: string }) {
  const geo = useMemo(
    () => buildLogo({ text, uppercase: false, shape: 'square', size: 100, scale: 62, spacing: 0 }, font),
    [font, text],
  );
  return (
    <svg viewBox={geo.viewBox} aria-hidden="true" className="h-12 w-full fill-current">
      <path d={geo.glyphPath} opacity={geo.placeholder ? 0.35 : 1} />
    </svg>
  );
}

function FontTile({ def, text, checked, onSelect }: { def: (typeof FONTS)[number]; text: string; checked: boolean; onSelect: () => void }) {
  const ref = useRef<HTMLLabelElement>(null);
  const font = useFontStore((s) => s.fonts[def.id]);
  const status = useFontStore((s) => s.status[def.id]);

  // Load the tile's font only once the tile is (nearly) visible.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void requestFont(def.id);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [def.id]);

  return (
    <label ref={ref} className="cursor-pointer">
      <input type="radio" name="font" value={def.id} checked={checked} onChange={onSelect} className="peer sr-only" />
      <span className="flex h-full flex-col items-center gap-1 rounded-xl bg-stone-100 px-2 pt-3 pb-2 text-stone-800 ring-1 ring-stone-200 transition-[box-shadow,background-color] duration-150 peer-checked:bg-white peer-checked:ring-2 peer-checked:ring-emerald-600 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-emerald-500 hover:bg-white dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700 dark:peer-checked:bg-stone-950 dark:peer-checked:ring-emerald-500 dark:hover:bg-stone-950">
        {font ? (
          <TileGlyphs font={font} text={text} />
        ) : (
          <span
            aria-hidden="true"
            className={`flex h-12 w-full items-center justify-center text-xs text-stone-500 ${
              status === 'error' ? '' : 'motion-safe:animate-pulse'
            }`}
          >
            {status === 'error' ? 'Unavailable' : ''}
          </span>
        )}
        <span className="w-full truncate text-center text-[11px] leading-tight text-stone-600 dark:text-stone-400">
          {def.family}
        </span>
      </span>
    </label>
  );
}

export function FontPicker() {
  const fontId = useLogoStore((s) => s.fontId);
  const setFontId = useLogoStore((s) => s.setFontId);
  const text = useLogoStore((s) => displayText(s.text, s.uppercase));

  return (
    <fieldset>
      <legend className="sr-only">Font</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
        {FONTS.map((def) => (
          <FontTile
            key={def.id}
            def={def}
            text={text}
            checked={def.id === fontId}
            onSelect={() => setFontId(def.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}
