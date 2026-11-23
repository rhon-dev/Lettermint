import { useId, useMemo } from 'react';
import type { Font } from 'opentype.js';
import { buildLogo, type LogoGeometry } from '../lib/buildLogo';
import { logoSvgBody } from '../lib/svg';
import type { LogoState } from '../store/logo';

/** Everything the renderer needs; the font itself is passed separately. */
export type MarkState = Omit<LogoState, 'fontId' | 'weight'>;

interface LogoMarkProps {
  state: MarkState;
  font: Font | null;
  className?: string;
  /** Accessible name; when omitted the mark is decorative. */
  label?: string;
  /** Precomputed geometry (avoids rebuilding when the caller already has it). */
  geometry?: LogoGeometry;
}

/**
 * The single renderer for a logo (artboard, gallery, mockups). Its markup comes from the same
 * `logoSvgBody` serializer the SVG, PNG and kit exports use, so what you see is what you export.
 */
export function LogoMark({ state, font, className, label, geometry }: LogoMarkProps) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const built = useMemo(() => geometry ?? buildLogo(state, font), [geometry, state, font]);
  // Inputs are validated (hex colors, numeric paths), so the serialized markup is safe to inject.
  const body = useMemo(() => ({ __html: logoSvgBody(state, built, `m${gid}`) }), [state, built, gid]);

  return (
    <svg
      viewBox={built.viewBox}
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <g dangerouslySetInnerHTML={body} />
      {built.placeholder && built.glyphPath && <path d={built.glyphPath} fill={state.fgColor} opacity={0.28} />}
    </svg>
  );
}
