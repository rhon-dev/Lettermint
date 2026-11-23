import { create } from 'zustand';
import { parseHex } from '../lib/color';
import { sanitizeName, sanitizeText } from '../lib/sanitize';
import { DEFAULT_RADIUS, DEFAULT_SEED, isShape, type Shape } from '../lib/shapes';
import { DEFAULT_FONT_ID, isFontId, isWeight, type FontId, type Weight } from '../fonts/registry';

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const LIMITS = {
  size: { min: 64, max: 1024, step: 8 },
  scale: { min: 30, max: 90, step: 1 },
  spacing: { min: -60, max: 30, step: 1 },
  gradientAngle: { min: 0, max: 360, step: 15 },
  radius: { min: 0, max: 50, step: 1 },
  blobSeed: { min: 1, max: 999, step: 1 },
  stroke: { min: 10, max: 80, step: 5 },
  shift: { min: -50, max: 50, step: 1 },
  rotate1: { min: -45, max: 45, step: 1 },
  rotate2: { min: -45, max: 45, step: 1 },
  // Letter positions, in 1/10000 of the canvas side (see lib/compose OFFSET_UNIT).
  dx1: { min: -5000, max: 5000, step: 1 },
  dy1: { min: -5000, max: 5000, step: 1 },
  dx2: { min: -5000, max: 5000, step: 1 },
  dy2: { min: -5000, max: 5000, step: 1 },
  /** Gap cut around the front (second) letter where it overlaps the first, ‰ of the canvas; 0 = off. */
  knockout: { min: 0, max: 60, step: 1 },
  /** Second letter size relative to the first, %. */
  scale2: { min: 40, max: 160, step: 1 },
} as const satisfies Record<string, Range>;

type NumericKey = keyof typeof LIMITS;

export const FILLS = ['solid', 'gradient'] as const;
export type Fill = (typeof FILLS)[number];

export const LETTER_STYLES = ['fill', 'outline'] as const;
export type LetterStyle = (typeof LETTER_STYLES)[number];

/** How two characters are laid out before letter positions apply. */
export const LAYOUTS = ['row', 'stack'] as const;
export type Layout = (typeof LAYOUTS)[number];

export interface LogoState {
  /** Sanitized text in the case the user typed it. */
  text: string;
  uppercase: boolean;
  shape: Shape;
  /** Rounded-square corner radius, % of the side. */
  radius: number;
  blobSeed: number;
  /** Inner border ring in the letter color. */
  ring: boolean;
  bgColor: string;
  /** Second gradient stop (used when fill === 'gradient'). */
  bgColor2: string;
  fill: Fill;
  /** CSS-style angle: 0° = bottom→top, 90° = left→right. Shared by both gradients. */
  gradientAngle: number;
  fgColor: string;
  fgColor2: string;
  fgFill: Fill;
  letterStyle: LetterStyle;
  /** Outline width, ‰ of the canvas. */
  stroke: number;
  fontId: FontId;
  weight: Weight;
  /** Typeface and weight of the second letter (the same as the first unless a design or the user mixes them). */
  fontId2: FontId;
  weight2: Weight;
  /** Second letter size relative to the first, %. */
  scale2: number;
  /** Paint the second letter in `secondColor` instead of the letter color. */
  twoTone: boolean;
  secondColor: string;
  /** Draw the first letter in front of the second (the overlap gap is then cut into the second). */
  firstOnTop: boolean;
  size: number;
  scale: number;
  spacing: number;
  /** Second letter vertical shift, % of the em. */
  shift: number;
  rotate1: number;
  rotate2: number;
  /** Two characters side by side ('row') or the second under the first ('stack'). */
  layout: Layout;
  /** Letter positions after fitting, in 1/10000 of the canvas side (so they survive any canvas or screen size). */
  dx1: number;
  dy1: number;
  dx2: number;
  dy2: number;
  /** Gap cut into the first letter around the second, ‰ of the canvas (0 = letters simply overlap). */
  knockout: number;
  /** Optional brand name for lockups and the kit (sanitized; may end in one space while typing). */
  brandName: string;
}

export const STATE_KEYS = [
  'text',
  'uppercase',
  'shape',
  'radius',
  'blobSeed',
  'ring',
  'bgColor',
  'bgColor2',
  'fill',
  'gradientAngle',
  'fgColor',
  'fgColor2',
  'fgFill',
  'letterStyle',
  'stroke',
  'fontId',
  'weight',
  'fontId2',
  'weight2',
  'scale2',
  'twoTone',
  'secondColor',
  'firstOnTop',
  'size',
  'scale',
  'spacing',
  'shift',
  'rotate1',
  'rotate2',
  'layout',
  'dx1',
  'dy1',
  'dx2',
  'dy2',
  'knockout',
  'brandName',
] as const satisfies readonly (keyof LogoState)[];

export type UntrustedState = Partial<Record<keyof LogoState, unknown>>;

export interface LogoActions {
  setText: (raw: string) => void;
  setBrandName: (raw: string) => void;
  setUppercase: (on: boolean) => void;
  setShape: (shape: string) => void;
  setBgColor: (hex: string) => void;
  setBgColor2: (hex: string) => void;
  setFill: (fill: string) => void;
  setGradientAngle: (n: number) => void;
  setFgColor: (hex: string) => void;
  setFontId: (id: string) => void;
  setSize: (n: number) => void;
  setScale: (n: number) => void;
  setSpacing: (n: number) => void;
  swapColors: () => void;
  /** Apply an untrusted partial state; every field goes through its validator. */
  apply: (partial: UntrustedState) => void;
  reset: () => void;
}

/**
 * The first mark a visitor sees: an art-directed Fraunces 800 "LM" in the Overlap composition,
 * ink on no shape, so the letterforms carry it in black and white at 160 px and at 16 px.
 */
export const DEFAULTS: LogoState = {
  text: 'LM',
  uppercase: true,
  shape: 'none',
  radius: DEFAULT_RADIUS,
  blobSeed: DEFAULT_SEED,
  ring: false,
  bgColor: '#e7e5e4',
  bgColor2: '#047857',
  fill: 'solid',
  gradientAngle: 135,
  fgColor: '#111111',
  fgColor2: '#a7f3d0',
  fgFill: 'solid',
  letterStyle: 'fill',
  stroke: 30,
  fontId: DEFAULT_FONT_ID,
  weight: 800,
  fontId2: DEFAULT_FONT_ID,
  weight2: 800,
  scale2: 100,
  twoTone: false,
  secondColor: '#047857',
  firstOnTop: false,
  size: 512,
  scale: 62,
  // Overlap starter for this font and pair (asserted in compose.test.ts).
  spacing: -18,
  shift: 14,
  rotate1: 0,
  rotate2: 0,
  layout: 'row',
  dx1: 0,
  dy1: 0,
  dx2: 0,
  dy2: 0,
  knockout: 16,
  brandName: '',
};

/** Clamp to [min, max] and snap to the step grid. Returns null for non-finite input. */
export function clampStep(value: number, { min, max, step }: Range): number | null {
  if (!Number.isFinite(value)) return null;
  const clamped = Math.min(max, Math.max(min, value));
  const snapped = min + Math.round((clamped - min) / step) * step;
  return Math.min(max, snapped);
}

export function isFill(value: unknown): value is Fill {
  return typeof value === 'string' && (FILLS as readonly string[]).includes(value);
}

function isLetterStyle(value: unknown): value is LetterStyle {
  return typeof value === 'string' && (LETTER_STYLES as readonly string[]).includes(value);
}

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') return Number(raw);
  return Number.NaN;
}

/** Validate an untrusted partial; invalid fields are dropped. */
export function validatePartial(p: UntrustedState): Partial<LogoState> {
  const out: Partial<LogoState> = {};
  if (typeof p.text === 'string') out.text = sanitizeText(p.text);
  if (typeof p.brandName === 'string') out.brandName = sanitizeName(p.brandName);
  for (const key of ['uppercase', 'ring', 'twoTone', 'firstOnTop'] as const) {
    if (typeof p[key] === 'boolean') out[key] = p[key];
  }
  if (isShape(p.shape)) out.shape = p.shape;
  if (isFill(p.fill)) out.fill = p.fill;
  if (isFill(p.fgFill)) out.fgFill = p.fgFill;
  if (isLetterStyle(p.letterStyle)) out.letterStyle = p.letterStyle;
  if (typeof p.layout === 'string' && (LAYOUTS as readonly string[]).includes(p.layout)) out.layout = p.layout as Layout;
  if (isFontId(p.fontId)) out.fontId = p.fontId;
  if (isFontId(p.fontId2)) out.fontId2 = p.fontId2;
  const weight = toNumber(p.weight);
  if (isWeight(weight)) out.weight = weight;
  const weight2 = toNumber(p.weight2);
  if (isWeight(weight2)) out.weight2 = weight2;
  for (const key of ['bgColor', 'bgColor2', 'fgColor', 'fgColor2', 'secondColor'] as const) {
    const v = p[key];
    const hex = typeof v === 'string' ? parseHex(v) : null;
    if (hex) out[key] = hex;
  }
  for (const key of Object.keys(LIMITS) as NumericKey[]) {
    if (!(key in p)) continue;
    const v = clampStep(toNumber(p[key]), LIMITS[key]);
    if (v !== null) out[key] = v;
  }
  return out;
}

/** Data-only snapshot of the store (no actions). */
export function pickState(s: LogoState): LogoState {
  const out: Record<string, unknown> = {};
  for (const k of STATE_KEYS) out[k] = s[k];
  return out as unknown as LogoState;
}

export function sameState(a: LogoState, b: LogoState): boolean {
  return STATE_KEYS.every((k) => a[k] === b[k]);
}

export const useLogoStore = create<LogoState & LogoActions>()((set, get) => {
  const apply = (partial: UntrustedState) => {
    const v = validatePartial(partial);
    if (Object.keys(v).length > 0) set(v);
  };
  return {
    ...DEFAULTS,
    setText: (raw) => set({ text: sanitizeText(raw) }),
    setBrandName: (raw) => set({ brandName: sanitizeName(raw) }),
    setUppercase: (on) => set({ uppercase: on === true }),
    setShape: (shape) => apply({ shape }),
    setBgColor: (bgColor) => apply({ bgColor }),
    setBgColor2: (bgColor2) => apply({ bgColor2 }),
    setFill: (fill) => apply({ fill }),
    setGradientAngle: (gradientAngle) => apply({ gradientAngle }),
    setFgColor: (fgColor) => apply({ fgColor }),
    setFontId: (fontId) => apply({ fontId }),
    setSize: (size) => apply({ size }),
    setScale: (scale) => apply({ scale }),
    setSpacing: (spacing) => apply({ spacing }),
    swapColors: () => {
      const { bgColor, fgColor } = get();
      set({ bgColor: fgColor, fgColor: bgColor });
    },
    apply,
    reset: () => set(DEFAULTS),
  };
});
