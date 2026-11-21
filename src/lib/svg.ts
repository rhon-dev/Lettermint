import type { LogoGeometry } from './buildLogo';
import { fmt } from './shapes';

export interface Paint {
  bgColor: string;
  bgColor2: string;
  fill: 'solid' | 'gradient';
  gradientAngle: number;
  fgColor: string;
  size: number;
}

/** Gradient line for a CSS-style angle (0° = bottom→top, 90° = left→right), spanning the canvas. */
export function gradientVector(angleDeg: number, size: number): { x1: number; y1: number; x2: number; y2: number } {
  const t = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  // Half-length so the 0%/100% stops touch the canvas corners (same as CSS).
  const half = (size / 2) * (Math.abs(dx) + Math.abs(dy));
  const c = size / 2;
  return { x1: c - dx * half, y1: c - dy * half, x2: c + dx * half, y2: c + dy * half };
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Standalone, dependency-free SVG document for export. */
export function logoSvgString(paint: Paint, geo: LogoGeometry, title: string): string {
  const s = paint.size;
  const gradient = paint.fill === 'gradient';
  let defs = '';
  if (gradient) {
    const v = gradientVector(paint.gradientAngle, s);
    defs =
      `<defs><linearGradient id="lm-bg" gradientUnits="userSpaceOnUse" x1="${fmt(v.x1)}" y1="${fmt(v.y1)}" x2="${fmt(v.x2)}" y2="${fmt(v.y2)}">` +
      `<stop offset="0" stop-color="${paint.bgColor}"/><stop offset="1" stop-color="${paint.bgColor2}"/></linearGradient></defs>`;
  }
  const glyph = geo.glyphPath && !geo.placeholder ? `<path d="${geo.glyphPath}" fill="${paint.fgColor}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geo.viewBox}" width="${s}" height="${s}" role="img">` +
    `<title>${escapeAttr(title)}</title>${defs}` +
    `<path d="${geo.shapePath}" fill="${gradient ? 'url(#lm-bg)' : paint.bgColor}"/>${glyph}</svg>`
  );
}
