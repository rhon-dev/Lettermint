import { useId, useMemo } from 'react';
import type { Font } from 'opentype.js';
import { buildLogo, type LogoGeometry } from '../lib/buildLogo';
import { gradientVector, letterGradientVector } from '../lib/svg';
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

/** The single renderer for a logo (preview, gallery, mockups). Export mirrors it in lib/svg. */
export function LogoMark({ state, font, className, label, geometry }: LogoMarkProps) {
  const gid = useId().replace(/:/g, '');
  const built = useMemo(() => geometry ?? buildLogo(state, font), [geometry, state, font]);
  const bg = state.fill === 'gradient' ? gradientVector(state.gradientAngle, state.size) : null;
  const fg = state.fgFill === 'gradient' ? letterGradientVector(state.gradientAngle, built, state.size) : null;
  const fgPaint = fg ? `url(#f${gid})` : state.fgColor;
  const outline = built.strokeWidth > 0;

  return (
    <svg
      viewBox={built.viewBox}
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {(bg || fg) && (
        <defs>
          {bg && (
            <linearGradient id={`b${gid}`} gradientUnits="userSpaceOnUse" x1={bg.x1} y1={bg.y1} x2={bg.x2} y2={bg.y2}>
              <stop offset="0" stopColor={state.bgColor} />
              <stop offset="1" stopColor={state.bgColor2} />
            </linearGradient>
          )}
          {fg && (
            <linearGradient id={`f${gid}`} gradientUnits="userSpaceOnUse" x1={fg.x1} y1={fg.y1} x2={fg.x2} y2={fg.y2}>
              <stop offset="0" stopColor={state.fgColor} />
              <stop offset="1" stopColor={state.fgColor2} />
            </linearGradient>
          )}
        </defs>
      )}
      {built.shapePath && (
        <path d={built.shapePath} fill={bg ? `url(#b${gid})` : state.bgColor} className="transition-[fill] duration-150" />
      )}
      {built.ringPath && (
        <path
          d={built.ringPath}
          transform={`translate(${built.ringOffset} ${built.ringOffset})`}
          fill="none"
          stroke={fgPaint}
          strokeWidth={built.ringWidth}
        />
      )}
      {built.glyphPath && (
        <path
          d={built.glyphPath}
          fill={outline ? 'none' : fgPaint}
          stroke={outline ? fgPaint : undefined}
          strokeWidth={outline ? built.strokeWidth : undefined}
          strokeLinejoin="round"
          opacity={built.placeholder ? 0.28 : 1}
          className="transition-[fill] duration-150"
        />
      )}
    </svg>
  );
}
