import { useShallow } from 'zustand/react/shallow';
import { getFontDef } from '../fonts/registry';
import { useFontStore } from '../lib/glyphs';
import { pickState, useLogoStore } from '../store/logo';

/** Current logo (data fields only) plus the font that is actually displayed. */
export function useCurrentMark() {
  const state = useLogoStore(useShallow(pickState));
  const activeKey = useFontStore((s) => s.activeKey);
  const font = useFontStore((s) => (s.activeKey ? (s.fonts[s.activeKey] ?? null) : null));
  const family = getFontDef(activeKey ? (activeKey.split(':')[0] as typeof state.fontId) : state.fontId).family;
  return { state, font, family };
}
