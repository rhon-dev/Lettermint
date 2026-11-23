import type { LogoGeometry } from './buildLogo';
import { fmt } from './shapes';

export interface Paint {
  bgColor: string;
  bgColor2: string;
  fill: 'solid' | 'gradient';
  gradientAngle: number;
  fgColor: string;
  fgColor2: string;
  fgFill: 'solid' | 'gradient';
  letterStyle: 'fill' | 'outline';
  size: number;
  /** Second letter in its own solid color. */
  twoTone?: boolean;
  secondColor?: string;
  /** First letter drawn in front of the second. */
  firstOnTop?: boolean;
}

export interface Vector {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Gradient line for a CSS-style angle (0° = bottom→top, 90° = left→right)
 * spanning a w×h rectangle at (x, y), so the 0%/100% stops touch its corners (same as CSS).
 */
export function gradientVector(angleDeg: number, w: number, h = w, x = 0, y = 0): Vector {
  const t = (angleDeg * Math.PI) / 180;
  const dx = Math.sin(t);
  const dy = -Math.cos(t);
  const half = (w * Math.abs(dx) + h * Math.abs(dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  return { x1: cx - dx * half, y1: cy - dy * half, x2: cx + dx * half, y2: cy + dy * half };
}

/** Letter gradient follows the glyph box so both stops are visible on the letters. */
export function letterGradientVector(angleDeg: number, geo: LogoGeometry, size: number): Vector {
  const b = geo.glyphBox;
  return b ? gradientVector(angleDeg, b.x2 - b.x1, b.y2 - b.y1, b.x1, b.y1) : gradientVector(angleDeg, size);
}

export function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function linear(id: string, v: Vector, a: string, b: string): string {
  return (
    `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${fmt(v.x1)}" y1="${fmt(v.y1)}" x2="${fmt(v.x2)}" y2="${fmt(v.y2)}">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`
  );
}

/** Inner SVG markup (defs + paths) for a logo; `idPrefix` keeps gradient ids unique when nested. */
export function logoSvgBody(paint: Paint, geo: LogoGeometry, idPrefix = 'lm'): string {
  const bgGrad = paint.fill === 'gradient';
  const fgGrad = paint.fgFill === 'gradient';
  let defs = '';
  if (bgGrad) defs += linear(`${idPrefix}-bg`, gradientVector(paint.gradientAngle, paint.size), paint.bgColor, paint.bgColor2);
  if (fgGrad) defs += linear(`${idPrefix}-fg`, letterGradientVector(paint.gradientAngle, geo, paint.size), paint.fgColor, paint.fgColor2);
  const fg = fgGrad ? `url(#${idPrefix}-fg)` : paint.fgColor;
  let body = defs ? `<defs>${defs}</defs>` : '';
  if (geo.shapePath) body += `<path d="${geo.shapePath}" fill="${bgGrad ? `url(#${idPrefix}-bg)` : paint.bgColor}"/>`;
  if (geo.ringPath) {
    const o = fmt(geo.ringOffset);
    body += `<path d="${geo.ringPath}" transform="translate(${o} ${o})" fill="none" stroke="${fg}" stroke-width="${fmt(geo.ringWidth)}"/>`;
  }
  if (geo.glyphPath && !geo.placeholder) {
    const draw = (d: string, color: string, extra = '') =>
      geo.strokeWidth > 0
        ? `<path d="${d}" fill="none" stroke="${color}" stroke-width="${fmt(geo.strokeWidth)}" stroke-linejoin="round"${extra}/>`
        : `<path d="${d}" fill="${color}"${extra}/>`;
    const [first, second] = geo.letters;
    const colors = [fg, paint.twoTone && paint.secondColor ? paint.secondColor : fg];
    // Back letter first, front letter last; the gap is cut into the back letter.
    const [back, front] = paint.firstOnTop ? [1, 0] : [0, 1];
    if (geo.knockoutWidth > 0 && first && second) {
      // The front letter, widened by the gap (and by half the outline), is cut out of the back one.
      const cut = fmt(geo.knockoutWidth * 2 + geo.strokeWidth);
      const [, , w, h] = geo.viewBox.split(' ');
      body +=
        `<mask id="${idPrefix}-ko" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">` +
        `<rect width="${w}" height="${h}" fill="#fff"/>` +
        `<path d="${geo.letters[front]!.d}" fill="#000" stroke="#000" stroke-width="${cut}" stroke-linejoin="round"/></mask>` +
        draw(geo.letters[back]!.d, colors[back]!, ` mask="url(#${idPrefix}-ko)"`) +
        draw(geo.letters[front]!.d, colors[front]!);
    } else if (first && second && (colors[0] !== colors[1] || paint.firstOnTop)) {
      body += draw(geo.letters[back]!.d, colors[back]!) + draw(geo.letters[front]!.d, colors[front]!);
    } else {
      body += draw(geo.glyphPath, fg);
    }
  }
  return body;
}

/** Standalone, dependency-free SVG document for export. */
export function logoSvgString(paint: Paint, geo: LogoGeometry, title: string): string {
  const s = paint.size;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geo.viewBox}" width="${s}" height="${s}" role="img">` +
    `<title>${escapeAttr(title)}</title>${logoSvgBody(paint, geo)}</svg>`
  );
}
