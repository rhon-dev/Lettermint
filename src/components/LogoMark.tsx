import { useId, useMemo } from 'react';
import type { Font } from 'opentype.js';
import { buildLogo, type LogoGeometry } from '../lib/buildLogo';
import { gradientVector } from '../lib/svg';
import type { LogoState } from '../store/logo';

export type MarkState = Pick<
  LogoState,
  'text' | 'uppercase' | 'shape' | 'size' | 'scale' | 'spacing' | 'bgColor' | 'bgColor2' | 'fill' | 'gradientAngle' | 'fgColor'
>;

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
  const gradient = state.fill === 'gradient';
  const v = gradient ? gradientVector(state.gradientAngle, state.size) : null;

  return (
    <svg
      viewBox={built.viewBox}
      className={className}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {v && (
        <defs>
          <linearGradient id={`g${gid}`} gradientUnits="userSpaceOnUse" x1={v.x1} y1={v.y1} x2={v.x2} y2={v.y2}>
            <stop offset="0" stopColor={state.bgColor} />
            <stop offset="1" stopColor={state.bgColor2} />
          </linearGradient>
        </defs>
      )}
      <path d={built.shapePath} fill={v ? `url(#g${gid})` : state.bgColor} className="transition-[fill] duration-150" />
      {built.glyphPath && (
        <path
          d={built.glyphPath}
          fill={state.fgColor}
          opacity={built.placeholder ? 0.28 : 1}
          className="transition-[fill] duration-150"
        />
      )}
    </svg>
  );
}
