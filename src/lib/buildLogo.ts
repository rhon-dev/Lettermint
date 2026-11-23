import type { Font } from 'opentype.js';
import { displayText } from './sanitize';
import { fmt, safeBox, shapePath, type Shape, type ShapeOpts } from './shapes';

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
  /** Rounded-square corner radius, % of the side. */
  radius?: number;
  /** Blob outline seed. */
  blobSeed?: number;
  /** Inner border ring inside the shape. */
  ring?: boolean;
  letterStyle?: 'fill' | 'outline';
  /** Outline stroke width in ‰ of the canvas. */
  stroke?: number;
  /** Vertical shift of the second letter, % of the em (positive = up). */
  shift?: number;
  /** Rotation of each letter around its own center, degrees (clockwise). */
  rotate1?: number;
  rotate2?: number;
  /** Two characters side by side ('row', default) or stacked. */
  layout?: 'row' | 'stack';
  /** Letter positions after fitting, in 1/10000 of the canvas side. */
  dx1?: number;
  dy1?: number;
  dx2?: number;
  dy2?: number;
  /** Gap cut into the first letter around the second, ‰ of the canvas. */
  knockout?: number;
}

/** One drawn character: its path and its own ink box in canvas coordinates. */
export interface LetterGeometry {
  d: string;
  box: Box | null;
}

export interface LogoGeometry {
  viewBox: string;
  shapePath: string;
  glyphPath: string;
  glyphCommands: GlyphCommand[];
  /** The same outline split per character (glyphPath is these paths joined), for selection and dragging. */
  letters: LetterGeometry[];
  /** Final glyph bounding box in canvas coordinates, or null when nothing is drawn. */
  glyphBox: Box | null;
  /** True when the input is empty and glyphPath shows the "Aa" placeholder. */
  placeholder: boolean;
  /** Outline stroke width in canvas units; 0 for filled letters. */
  strokeWidth: number;
  /** Gap around the second letter cut out of the first, canvas units; 0 when off or not two letters. */
  knockoutWidth: number;
  /** Ring outline (the shape at a smaller size), drawn translated by ringOffset; '' when off. */
  ringPath: string;
  ringOffset: number;
  ringWidth: number;
}

export const PLACEHOLDER_TEXT = 'Aa';

/** Ring geometry as fractions of the canvas. */
export const RING_INNER = { scale: 0.86, width: 0.022 } as const;

type Map2 = (x: number, y: number) => [number, number];

export function mapCommands(cmds: readonly GlyphCommand[], f: Map2): GlyphCommand[] {
  return cmds.map((c): GlyphCommand => {
    switch (c.type) {
      case 'M':
      case 'L': {
        const [x, y] = f(c.x, c.y);
        return { type: c.type, x, y };
      }
      case 'Q': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x, y] = f(c.x, c.y);
        return { type: 'Q', x1, y1, x, y };
      }
      case 'C': {
        const [x1, y1] = f(c.x1, c.y1);
        const [x2, y2] = f(c.x2, c.y2);
        const [x, y] = f(c.x, c.y);
        return { type: 'C', x1, y1, x2, y2, x, y };
      }
      case 'Z':
        return c;
    }
  });
}

/** Rotate (degrees, clockwise in y-down space) around the outline's own box center, then translate. */
function placeLetter(cmds: GlyphCommand[], deg: number, dy: number): GlyphCommand[] {
  if (deg === 0 && dy === 0) return cmds;
  const box = commandsBox(cmds);
  if (!box) return cmds;
  const cx = (box.x1 + box.x2) / 2;
  const cy = (box.y1 + box.y2) / 2;
  const t = (deg * Math.PI) / 180;
  const [cos, sin] = [Math.cos(t), Math.sin(t)];
  return mapCommands(cmds, (x, y) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos + dy]);
}

/** Per-letter adjustments for two-character marks. */
export interface LetterPlacement {
  shiftEm: number;
  rotate: [number, number];
  layout?: 'row' | 'stack';
}

const center = (b: Box) => [(b.x1 + b.x2) / 2, (b.y1 + b.y2) / 2] as const;

/**
 * Lay out characters in font units, one command list per character. A row sits on a baseline at
 * y = 0; a stack centers the second letter under the first, `spacingEm` below its measured ink.
 */
export function layoutLetters(font: GlyphFont, text: string, spacingEm: number, place?: LetterPlacement): GlyphCommand[][] {
  const upm = font.unitsPerEm;
  const glyphs = Array.from(text, (c) => font.charToGlyph(c));
  if (place?.layout === 'stack' && glyphs.length === 2) {
    const [top, bottom] = glyphs.map((g, i) => placeLetter(g.getPath(0, 0, upm).commands as GlyphCommand[], place.rotate[i] ?? 0, 0));
    const a = commandsBox(top!);
    const b = commandsBox(bottom!);
    if (a && b) {
      const dx = center(a)[0] - center(b)[0];
      const dy = a.y2 - b.y1 + (spacingEm - place.shiftEm) * upm;
      return [top!, mapCommands(bottom!, (x, y) => [x + dx, y + dy])];
    }
  }
  const out: GlyphCommand[][] = [];
  let x = 0;
  glyphs.forEach((glyph, i) => {
    let cmds = glyph.getPath(x, 0, upm).commands as GlyphCommand[];
    if (place) cmds = placeLetter(cmds, place.rotate[i] ?? 0, i === 1 ? -place.shiftEm * upm : 0);
    out.push(cmds);
    x += glyph.advanceWidth ?? 0;
    const next = glyphs[i + 1];
    if (next) x += font.getKerningValue(glyph, next) + spacingEm * upm;
  });
  return out;
}

/** Characters on a baseline at y = 0 in font units, as one outline. */
export function layoutGlyphs(font: GlyphFont, text: string, spacingEm: number, place?: LetterPlacement): GlyphCommand[] {
  return layoutLetters(font, text, spacingEm, place).flat();
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

export interface FitOpts {
  shapeOpts?: ShapeOpts;
  /** Fit inside the shape scaled by this factor around the center (inner ring). */
  inset?: number;
  /** Extra width/height the drawn glyphs need beyond their outline (outline stroke), canvas units. */
  pad?: number;
}

/**
 * Scale so the glyph box height is `scalePct`% of the canvas, capped so the
 * box (plus `pad`) fits inside the shape, then center the box on the canvas center.
 */
export function fitGlyphBox(
  box: Box,
  shape: Shape,
  size: number,
  scalePct: number,
  { shapeOpts, inset = 1, pad = 0 }: FitOpts = {},
): { k: number; tx: number; ty: number } {
  const w = box.x2 - box.x1;
  const h = box.y2 - box.y1;
  const targetK = (size * scalePct) / 100 / h;
  const safe = safeBox(shape, size * inset, w / h, shapeOpts);
  const k = Math.max(1e-9, Math.min(targetK, (safe.height - pad) / h, (safe.width - pad) / w));
  return {
    k,
    tx: size / 2 - ((box.x1 + box.x2) / 2) * k,
    ty: size / 2 - ((box.y1 + box.y2) / 2) * k,
  };
}

export function transformCommands(cmds: readonly GlyphCommand[], k: number, tx: number, ty: number): GlyphCommand[] {
  return mapCommands(cmds, (x, y) => [x * k + tx, y * k + ty]);
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
  letters: LetterGeometry[];
}

/**
 * Fit the laid-out letters to the canvas, then move each letter by its offset (canvas units).
 * Offsets apply after fitting, so dragging one letter never rescales or moves the other.
 */
export function buildGlyphs(
  font: GlyphFont,
  text: string,
  opts: {
    shape: Shape;
    size: number;
    scale: number;
    spacingEm: number;
    place?: LetterPlacement;
    offsets?: readonly (readonly [number, number])[];
  } & FitOpts,
): GlyphBuild {
  const raw = layoutLetters(font, text, opts.spacingEm, opts.place);
  const src = commandsBox(raw.flat());
  if (!src) return { commands: [], d: '', box: null, letters: [] };
  const { k, tx, ty } = fitGlyphBox(src, opts.shape, opts.size, opts.scale, opts);
  const placed = raw.map((cmds, i) => {
    const [ox, oy] = opts.offsets?.[i] ?? [0, 0];
    return transformCommands(cmds, k, tx + ox, ty + oy);
  });
  const letters = placed.map((cmds) => ({ d: toPathData(cmds), box: commandsBox(cmds) }));
  const commands = placed.flat();
  return { commands, d: letters.map((l) => l.d).join(''), box: commandsBox(commands), letters };
}

/** Pure geometry for the whole logo. React components only render the result. */
export function buildLogo(state: LogoInput, font: GlyphFont | null): LogoGeometry {
  const { size, shape } = state;
  const text = displayText(state.text, state.uppercase);
  const placeholder = text.length === 0;
  const shown = placeholder ? PLACEHOLDER_TEXT : text;
  const pair = !placeholder && Array.from(shown).length === 2;
  const shapeOpts: ShapeOpts = { radius: state.radius, seed: state.blobSeed };
  const ring = state.ring === true && shape !== 'none';
  const strokeWidth = state.letterStyle === 'outline' ? (size * (state.stroke ?? 30)) / 1000 : 0;
  const glyphs = font
    ? buildGlyphs(font, shown, {
        shape,
        size,
        scale: state.scale,
        spacingEm: pair ? state.spacing / 100 : 0,
        place: pair
          ? { shiftEm: (state.shift ?? 0) / 100, rotate: [state.rotate1 ?? 0, state.rotate2 ?? 0], layout: state.layout }
          : undefined,
        offsets: placeholder
          ? undefined
          : [
              [((state.dx1 ?? 0) * size) / 1e4, ((state.dy1 ?? 0) * size) / 1e4],
              [((state.dx2 ?? 0) * size) / 1e4, ((state.dy2 ?? 0) * size) / 1e4],
            ],
        shapeOpts,
        inset: ring ? RING_INNER.scale - RING_INNER.width * 2 : 1,
        pad: strokeWidth,
      })
    : null;
  const ringSize = size * RING_INNER.scale;
  return {
    viewBox: `0 0 ${size} ${size}`,
    shapePath: shapePath(shape, size, shapeOpts),
    glyphPath: glyphs?.d ?? '',
    glyphCommands: glyphs?.commands ?? [],
    letters: glyphs?.letters ?? [],
    glyphBox: glyphs?.box ?? null,
    placeholder,
    strokeWidth,
    knockoutWidth: pair && (glyphs?.letters.length ?? 0) === 2 ? ((state.knockout ?? 0) * size) / 1000 : 0,
    ringPath: ring ? shapePath(shape, ringSize, shapeOpts) : '',
    ringOffset: (size - ringSize) / 2,
    ringWidth: size * RING_INNER.width,
  };
}
