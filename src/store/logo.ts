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
} as const satisfies Record<string, Range>;

type NumericKey = keyof typeof LIMITS;

export const FILLS = ['solid', 'gradient'] as const;
export type Fill = (typeof FILLS)[number];

export const LETTER_STYLES = ['fill', 'outline'] as const;
export type LetterStyle = (typeof LETTER_STYLES)[number];

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
  size: number;
  scale: number;
  spacing: number;
  /** Second letter vertical shift, % of the em. */
  shift: number;
  rotate1: number;
  rotate2: number;
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
  'size',
  'scale',
  'spacing',
  'shift',
  'rotate1',
  'rotate2',
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

export const DEFAULTS: LogoState = {
  text: 'LM',
  uppercase: true,
  shape: 'circle',
  radius: DEFAULT_RADIUS,
  blobSeed: DEFAULT_SEED,
  ring: false,
  bgColor: '#111111',
  bgColor2: '#047857',
  fill: 'solid',
  gradientAngle: 135,
  fgColor: '#ffffff',
  fgColor2: '#a7f3d0',
  fgFill: 'solid',
  letterStyle: 'fill',
  stroke: 30,
  fontId: DEFAULT_FONT_ID,
  weight: 700,
  size: 512,
  scale: 55,
  spacing: 0,
  shift: 0,
  rotate1: 0,
  rotate2: 0,
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
  for (const key of ['uppercase', 'ring'] as const) {
    if (typeof p[key] === 'boolean') out[key] = p[key];
  }
  if (isShape(p.shape)) out.shape = p.shape;
  if (isFill(p.fill)) out.fill = p.fill;
  if (isFill(p.fgFill)) out.fgFill = p.fgFill;
  if (isLetterStyle(p.letterStyle)) out.letterStyle = p.letterStyle;
  if (isFontId(p.fontId)) out.fontId = p.fontId;
  const weight = toNumber(p.weight);
  if (isWeight(weight)) out.weight = weight;
  for (const key of ['bgColor', 'bgColor2', 'fgColor', 'fgColor2'] as const) {
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
