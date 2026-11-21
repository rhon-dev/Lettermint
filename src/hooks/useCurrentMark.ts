import { useShallow } from 'zustand/react/shallow';
import { getFontDef } from '../fonts/registry';
import { useFontStore } from '../lib/glyphs';
import { useLogoStore } from '../store/logo';
import type { MarkState } from '../components/LogoMark';

/** Current logo (render fields only) plus the font that is actually displayed. */
export function useCurrentMark() {
  const state: MarkState = useLogoStore(
    useShallow((s) => ({
      text: s.text,
      uppercase: s.uppercase,
      shape: s.shape,
      size: s.size,
      scale: s.scale,
      spacing: s.spacing,
      bgColor: s.bgColor,
      bgColor2: s.bgColor2,
      fill: s.fill,
      gradientAngle: s.gradientAngle,
      fgColor: s.fgColor,
    })),
  );
  const fontId = useLogoStore((s) => s.fontId);
  const activeId = useFontStore((s) => s.activeId);
  const font = useFontStore((s) => (s.activeId ? (s.fonts[s.activeId] ?? null) : null));
  const family = getFontDef(activeId ?? fontId).family;
  return { state, font, family };
}
