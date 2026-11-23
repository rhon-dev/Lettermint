/** Composition: starter layouts, letter positions, snapping and screen ↔ logo coordinates. Pure; no DOM. */
import { LIMITS, clampStep, type LogoState } from '../store/logo';
import { commandsBox, layoutLetters, type GlyphFont } from './buildLogo';

/** Letter offsets are stored in 1/OFFSET_UNIT of the canvas side, so they survive any canvas or screen size. */
export const OFFSET_UNIT = 10000;

/** Arrow-key nudge, and the larger step with Shift, in offset units (0.5% and 5% of the canvas). */
export const NUDGE = { small: 50, large: 500 } as const;

export type Composition = 'side' | 'overlap' | 'stack';

/** Knockout gap the Overlap starter uses, ‰ of the canvas. */
export const OVERLAP_GAP = 16;

export const COMPOSITIONS: readonly { id: Composition; label: string }[] = [
  { id: 'side', label: 'Side by side' },
  { id: 'overlap', label: 'Overlap' },
  { id: 'stack', label: 'Stack' },
];

/** The only fields a starter may change. */
export const COMPOSITION_KEYS = ['layout', 'spacing', 'shift', 'knockout', 'dx1', 'dy1', 'dx2', 'dy2'] as const satisfies readonly (keyof LogoState)[];

export type CompositionPatch = Pick<LogoState, (typeof COMPOSITION_KEYS)[number]>;

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Client (screen) point to logo coordinates for a square viewBox drawn with the default `xMidYMid meet`. */
export function clientToLogo(clientX: number, clientY: number, rect: Rect, size: number): { x: number; y: number } {
  const scale = Math.min(rect.width, rect.height) / size;
  const left = rect.left + (rect.width - size * scale) / 2;
  const top = rect.top + (rect.height - size * scale) / 2;
  return { x: (clientX - left) / scale, y: (clientY - top) / scale };
}

/** Logo units (canvas pixels) to offset units. */
export function offsetDelta(logoUnits: number, size: number): number {
  return (logoUnits / size) * OFFSET_UNIT;
}

export type OffsetKey = 'dx1' | 'dy1' | 'dx2' | 'dy2';
export const offsetKeys = (index: number): [OffsetKey, OffsetKey] => (index === 0 ? ['dx1', 'dy1'] : ['dx2', 'dy2']);

export const clampOffset = (v: number) => clampStep(v, LIMITS.dx1) ?? 0;

export type Direction = 'left' | 'right' | 'up' | 'down';

export function nudgeOffsets(state: LogoState, index: number, dir: Direction, large: boolean): Partial<LogoState> {
  const [kx, ky] = offsetKeys(index);
  const key = dir === 'left' || dir === 'right' ? kx : ky;
  const sign = dir === 'left' || dir === 'up' ? -1 : 1;
  return { [key]: clampOffset(state[key] + sign * (large ? NUDGE.large : NUDGE.small)) };
}

/** Limit a drag (logo units) so the letter's ink box (at drag start) stays on the canvas. */
export function keepInCanvas(box: { x1: number; y1: number; x2: number; y2: number }, dx: number, dy: number, size: number) {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return { dx: clamp(dx, -box.x1, size - box.x2), dy: clamp(dy, -box.y1, size - box.y2) };
}

export interface Snap {
  dx: number;
  dy: number;
  /** Logo coordinate of the guide line to draw, or null when that axis did not snap. */
  guideX: number | null;
  guideY: number | null;
}

/** Pull a letter center onto the nearest target within `threshold` (logo units), per axis. */
export function snapCenter(c: { x: number; y: number }, targets: { x: number[]; y: number[] }, threshold: number): Snap {
  const near = (v: number, list: number[]) => {
    let best: number | null = null;
    for (const t of list) if (Math.abs(t - v) <= threshold && (best === null || Math.abs(t - v) < Math.abs(best - v))) best = t;
    return best;
  };
  const gx = near(c.x, targets.x);
  const gy = near(c.y, targets.y);
  return { dx: gx === null ? 0 : gx - c.x, dy: gy === null ? 0 : gy - c.y, guideX: gx, guideY: gy };
}

/** Accessible names that stay distinct for repeated letters ("First A", "Second A"). */
export function letterLabels(text: string): string[] {
  const chars = Array.from(text);
  if (chars.length === 1) return [`Letter ${chars[0]}`];
  return chars.map((c, i) => `${i === 0 ? 'First' : 'Second'} ${c}`);
}

/** The second letter's own typeface and relative size (1 = same as the first). */
export interface SecondLetter {
  font?: GlyphFont;
  scale?: number;
}

/**
 * A starter composition from the measured ink of the two letters (not their advance widths),
 * so narrow pairs (II), wide pairs (MW) and mixed pairs (AR) get the same visual relationship.
 * Positions are reset; nothing outside COMPOSITION_KEYS changes.
 */
export function composeStarter(kind: Composition, font: GlyphFont, text: string, second?: SecondLetter): CompositionPatch {
  const upm = font.unitsPerEm;
  const reset = { knockout: 0, dx1: 0, dy1: 0, dx2: 0, dy2: 0 };
  const [a, b] = layoutLetters(font, text, 0, { shiftEm: 0, rotate: [0, 0], font2: second?.font, scale2: second?.scale }).map((c) =>
    commandsBox(c),
  );
  if (!a || !b) return { layout: 'row', spacing: 0, shift: 0, ...reset };
  const height = Math.max(a.y2 - a.y1, b.y2 - b.y1);
  const em = (units: number) => (units / upm) * 100;
  const spacing = (n: number) => clampStep(n, LIMITS.spacing) ?? 0;
  if (kind === 'stack') return { layout: 'stack', spacing: spacing(em(height * 0.12)), shift: 0, ...reset };
  const gap0 = b.x1 - a.x2;
  if (kind === 'side') return { layout: 'row', spacing: spacing(em(height * 0.12 - gap0)), shift: 0, ...reset };
  // Overlap: interlock by a quarter of the narrower letter, raise the second letter so feet and
  // bowls of the first stay visible below it, and cut a gap around it so the letters never merge.
  const overlap = Math.min(a.x2 - a.x1, b.x2 - b.x1) / 4;
  return {
    layout: 'row',
    spacing: spacing(em(-overlap - gap0)),
    shift: clampStep(em(height * 0.2), LIMITS.shift) ?? 0,
    ...reset,
    knockout: OVERLAP_GAP,
  };
}

/** Which starter the state currently matches exactly, if any. */
export function activeStarter(state: LogoState, font: GlyphFont, text: string, second?: SecondLetter): Composition | null {
  for (const { id } of COMPOSITIONS) {
    const p = composeStarter(id, font, text, second);
    if (COMPOSITION_KEYS.every((k) => p[k] === state[k])) return id;
  }
  return null;
}
