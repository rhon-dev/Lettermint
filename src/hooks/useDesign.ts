import { useEffect, useMemo } from 'react';
import type { Font } from 'opentype.js';
import { designState, type Design } from '../lib/designs';
import { fontKey, requestFont, useFontStore } from '../lib/glyphs';
import type { LogoState } from '../store/logo';

/** Both faces of a design, loaded into the shared font store (null until ready). */
export function useDesignFonts(d: Design): [Font | null, Font | null] {
  const [a, b] = d.fonts;
  useEffect(() => {
    void requestFont(a.id, a.weight);
    void requestFont(b.id, b.weight);
  }, [a.id, a.weight, b.id, b.weight]);
  const f1 = useFontStore((s) => s.fonts[fontKey(a.id, a.weight)] ?? null);
  const f2 = useFontStore((s) => s.fonts[fontKey(b.id, b.weight)] ?? null);
  return [f1, f2];
}

/** The design rendered for these initials by the same renderer the editor and exports use. */
export function useDesign(d: Design, text: string): { state: LogoState | null; font: Font | null; font2: Font | null } {
  const [font, font2] = useDesignFonts(d);
  const state = useMemo(() => (font && font2 ? designState(d, text, font, font2) : null), [d, text, font, font2]);
  return { state, font, font2 };
}
