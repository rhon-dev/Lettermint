import { FONTS, type FontId } from '../fonts/registry';
import type { LogoState } from '../store/logo';
import { PALETTES } from './palettes';
import { SHAPES } from './shapes';

/** Small deterministic PRNG so a seed reproduces the same gallery. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.floor(rand() * list.length) % list.length] as T;
}

export type Variation = Pick<
  LogoState,
  'shape' | 'fontId' | 'bgColor' | 'bgColor2' | 'fgColor' | 'fill' | 'gradientAngle' | 'scale'
>;

const ANGLES = [45, 90, 135, 180, 225] as const;

export function randomVariation(rand: () => number): Variation {
  const palette = pick(rand, PALETTES);
  const fill = rand() < 0.35 ? 'gradient' : 'solid';
  return {
    shape: pick(rand, SHAPES),
    fontId: pick(rand, FONTS).id as FontId,
    bgColor: palette.bg,
    bgColor2: palette.bg2,
    fgColor: palette.fg,
    fill,
    gradientAngle: pick(rand, ANGLES),
    scale: 45 + Math.floor(rand() * 4) * 5,
  };
}

/** `count` variations that differ in at least font or shape+palette from each other. */
export function variationSet(seed: number, count: number): Variation[] {
  const rand = mulberry32(seed);
  const out: Variation[] = [];
  const seen = new Set<string>();
  for (let tries = 0; out.length < count && tries < count * 20; tries++) {
    const v = randomVariation(rand);
    const key = `${v.fontId}|${v.shape}|${v.bgColor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
