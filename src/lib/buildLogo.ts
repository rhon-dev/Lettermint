import type { Font } from 'opentype.js';
import { displayText } from './sanitize';
import { fmt, safeBox, shapePath, type Shape } from './shapes';

/** Path command shape produced by opentype.js (SVG coordinate space, y down). */
export type GlyphCommand =
  | { type: 'M' | 'L'; x: number; y: number }
  | { type: 'Q'; x1: number; y1: number; x: number; y: number }
  | { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { type: 'Z' };

/** Fonts are opentype.js Font objects (type-only import: no runtime dependency). */
export type GlyphFont = Font;

export interface Box {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface LogoInput {
  text: string;
  uppercase: boolean;
  shape: Shape;
  size: number;
  /** Glyph box height as % of the canvas (30–90). */
  scale: number;
  /** Extra space between two characters, in % of the em (applies to 2-char input). */
  spacing: number;
}

export interface LogoGeometry {
  viewBox: string;
  shapePath: string;
  glyphPath: string;
  /** Final glyph bounding box in canvas coordinates, or null when nothing is drawn. */
  glyphBox: Box | null;
  /** True when the input is empty and glyphPath shows the "Aa" placeholder. */
  placeholder: boolean;
}

export const PLACEHOLDER_TEXT = 'Aa';

/** Lay out characters on a baseline at y = 0 in font units. */
export function layoutGlyphs(font: GlyphFont, text: string, spacingEm: number): GlyphCommand[] {
  const upm = font.unitsPerEm;
  const glyphs = Array.from(text, (c) => font.charToGlyph(c));
  const out: GlyphCommand[] = [];
  let x = 0;
  glyphs.forEach((glyph, i) => {
    for (const cmd of glyph.getPath(x, 0, upm).commands) out.push(cmd as GlyphCommand);
    x += glyph.advanceWidth ?? 0;
    const next = glyphs[i + 1];
    if (next) x += font.getKerningValue(glyph, next) + spacingEm * upm;
  });
  return out;
}

function quadExtrema(p0: number, p1: number, p2: number): number[] {
  const den = p0 - 2 * p1 + p2;
  if (Math.abs(den) < 1e-12) return [];
  const t = (p0 - p1) / den;
  return t > 0 && t < 1 ? [(1 - t) ** 2 * p0 + 2 * (1 - t) * t * p1 + t * t * p2] : [];
}

function cubicExtrema(p0: number, p1: number, p2: number, p3: number): number[] {
  const d0 = p1 - p0;
  const d1 = p2 - p1;
  const d2 = p3 - p2;
  const a = d0 - 2 * d1 + d2;
  const b = 2 * (d1 - d0);
  const c = d0;
  const ts: number[] = [];
  if (Math.abs(a) < 1e-12) {
    if (Math.abs(b) > 1e-12) ts.push(-c / b);
  } else {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      ts.push((-b + sq) / (2 * a), (-b - sq) / (2 * a));
    }
  }
  return ts
    .filter((t) => t > 0 && t < 1)
    .map((t) => (1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3);
}

/** Exact bounding box of the outline (curve extrema, not control points). */
export function commandsBox(cmds: readonly GlyphCommand[]): Box | null {
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  const addX = (x: number) => {
    if (x < x1) x1 = x;
    if (x > x2) x2 = x;
  };
  const addY = (y: number) => {
    if (y < y1) y1 = y;
    if (y > y2) y2 = y;
  };
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  for (const c of cmds) {
    switch (c.type) {
      case 'M':
        sx = c.x;
        sy = c.y;
        cx = c.x;
        cy = c.y;
        break;
      case 'L':
        addX(cx);
        addY(cy);
        addX(c.x);
        addY(c.y);
        cx = c.x;
        cy = c.y;
        break;
      case 'Q':
        addX(cx);
        addY(cy);
        addX(c.x);
        addY(c.y);
        quadExtrema(cx, c.x1, c.x).forEach(addX);
        quadExtrema(cy, c.y1, c.y).forEach(addY);
        cx = c.x;
        cy = c.y;
        break;
      case 'C':
        addX(cx);
        addY(cy);
        addX(c.x);
        addY(c.y);
        cubicExtrema(cx, c.x1, c.x2, c.x).forEach(addX);
        cubicExtrema(cy, c.y1, c.y2, c.y).forEach(addY);
        cx = c.x;
        cy = c.y;
        break;
      case 'Z':
        cx = sx;
        cy = sy;
        break;
    }
  }
  if (!Number.isFinite(x1) || x2 - x1 <= 0 || y2 - y1 <= 0) return null;
  return { x1, y1, x2, y2 };
}

/**
 * Scale so the glyph box height is `scalePct`% of the canvas, capped so the
 * box fits inside the shape, then center the box on the canvas center.
 */
export function fitGlyphBox(
  box: Box,
  shape: Shape,
  size: number,
  scalePct: number,
): { k: number; tx: number; ty: number } {
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const targetK = (size * scalePct) / 100 / h;
  const safe = safeBox(shape, size, w / h);
  const k = Math.min(targetK, safe.height / h, safe.width / w);
  return {
    k,
    tx: size / 2 - ((box.x1 + box.x2) / 2) * k,
    ty: size / 2 - ((box.y1 + box.y2) / 2) * k,
  };
}

export function transformCommands(cmds: readonly GlyphCommand[], k: number, tx: number, ty: number): GlyphCommand[] {
  const X = (x: number) => x * k + tx;
  const Y = (y: number) => y * k + ty;
  return cmds.map((c): GlyphCommand => {
    switch (c.type) {
      case 'M':
      case 'L':
        return { type: c.type, x: X(c.x), y: Y(c.y) };
      case 'Q':
        return { type: 'Q', x1: X(c.x1), y1: Y(c.y1), x: X(c.x), y: Y(c.y) };
      case 'C':
        return { type: 'C', x1: X(c.x1), y1: Y(c.y1), x2: X(c.x2), y2: Y(c.y2), x: X(c.x), y: Y(c.y) };
      case 'Z':
        return c;
    }
  });
}

export function toPathData(cmds: readonly GlyphCommand[]): string {
  let d = '';
  for (const c of cmds) {
    switch (c.type) {
      case 'M':
      case 'L':
        d += `${c.type}${fmt(c.x)} ${fmt(c.y)}`;
        break;
      case 'Q':
        d += `Q${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x)} ${fmt(c.y)}`;
        break;
      case 'C':
        d += `C${fmt(c.x1)} ${fmt(c.y1)} ${fmt(c.x2)} ${fmt(c.y2)} ${fmt(c.x)} ${fmt(c.y)}`;
        break;
      case 'Z':
        d += 'Z';
        break;
    }
  }
  return d;
}

export interface GlyphBuild {
  commands: GlyphCommand[];
  d: string;
  box: Box | null;
}

export function buildGlyphs(
  font: GlyphFont,
  text: string,
  opts: { shape: Shape; size: number; scale: number; spacingEm: number },
): GlyphBuild {
  const raw = layoutGlyphs(font, text, opts.spacingEm);
  const src = commandsBox(raw);
  if (!src) return { commands: [], d: '', box: null };
  const { k, tx, ty } = fitGlyphBox(src, opts.shape, opts.size, opts.scale);
  const commands = transformCommands(raw, k, tx, ty);
  return {
    commands,
    d: toPathData(commands),
    box: { x1: src.x1 * k + tx, y1: src.y1 * k + ty, x2: src.x2 * k + tx, y2: src.y2 * k + ty },
  };
}

/** Pure geometry for the whole logo. React components only render the result. */
export function buildLogo(state: LogoInput, font: GlyphFont | null): LogoGeometry {
  const text = displayText(state.text, state.uppercase);
  const placeholder = text.length === 0;
  const shown = placeholder ? PLACEHOLDER_TEXT : text;
  const spacingEm = !placeholder && Array.from(shown).length === 2 ? state.spacing / 100 : 0;
  const glyphs = font
    ? buildGlyphs(font, shown, { shape: state.shape, size: state.size, scale: state.scale, spacingEm })
    : null;
  return {
    viewBox: `0 0 ${state.size} ${state.size}`,
    shapePath: shapePath(state.shape, state.size),
    glyphPath: glyphs?.d ?? '',
    glyphBox: glyphs?.box ?? null,
    placeholder,
  };
}
