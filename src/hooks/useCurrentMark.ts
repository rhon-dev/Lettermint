import { useShallow } from 'zustand/react/shallow';
import { getFontDef } from '../fonts/registry';
import { fontKey, useFontStore } from '../lib/glyphs';
import { pickState, useLogoStore } from '../store/logo';

/** Current logo (data fields only) plus the fonts that are actually displayed. */
export function useCurrentMark() {
  const state = useLogoStore(useShallow(pickState));
  const activeKey = useFontStore((s) => s.activeKey);
  const activeKey2 = useFontStore((s) => s.activeKey2);
  const font = useFontStore((s) => (s.activeKey ? (s.fonts[s.activeKey] ?? null) : null));
  // Until the second typeface has loaded once, the second letter is drawn in the first.
  const font2 = useFontStore((s) => (s.activeKey2 ? (s.fonts[s.activeKey2] ?? null) : null)) ?? font;
  const family = getFontDef(activeKey ? (activeKey.split(':')[0] as typeof state.fontId) : state.fontId).family;
  const key = fontKey(state.fontId, state.weight);
  const key2 = fontKey(state.fontId2, state.weight2);
  // The displayed fonts are the chosen ones (not the previous fonts kept on screen while new ones load).
  const fontReady = font !== null && activeKey === key && activeKey2 === key2;
  const failed = useFontStore((s) => s.status[key] === 'error' || s.status[key2] === 'error');
  return { state, font, font2, family, fontReady, fontFailed: failed, wantedFamily: getFontDef(state.fontId).family };
}
