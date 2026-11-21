import { create } from 'zustand';
import { parseHex } from '../lib/color';
import { sanitizeText } from '../lib/sanitize';
import { isShape, type Shape } from '../lib/shapes';
import { DEFAULT_FONT_ID, isFontId, type FontId } from '../fonts/registry';

export interface Range {
  min: number;
  max: number;
  step: number;
}

export const LIMITS = {
  size: { min: 64, max: 1024, step: 8 },
  scale: { min: 30, max: 90, step: 1 },
  spacing: { min: -10, max: 30, step: 1 },
  gradientAngle: { min: 0, max: 360, step: 15 },
} as const satisfies Record<string, Range>;

export const FILLS = ['solid', 'gradient'] as const;
export type Fill = (typeof FILLS)[number];

export interface LogoState {
  /** Sanitized text in the case the user typed it. */
  text: string;
  uppercase: boolean;
  shape: Shape;
  bgColor: string;
  /** Second gradient stop (used when fill === 'gradient'). */
  bgColor2: string;
  fill: Fill;
  /** CSS-style angle: 0° = bottom→top, 90° = left→right. */
  gradientAngle: number;
  fgColor: string;
  fontId: FontId;
  size: number;
  scale: number;
  spacing: number;
}

export const STATE_KEYS = [
  'text',
  'uppercase',
  'shape',
  'bgColor',
  'bgColor2',
  'fill',
  'gradientAngle',
  'fgColor',
  'fontId',
  'size',
  'scale',
  'spacing',
] as const satisfies readonly (keyof LogoState)[];

export type UntrustedState = Partial<Record<keyof LogoState, unknown>>;

export interface LogoActions {
  setText: (raw: string) => void;
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
  bgColor: '#111111',
  bgColor2: '#047857',
  fill: 'solid',
  gradientAngle: 135,
  fgColor: '#ffffff',
  fontId: DEFAULT_FONT_ID,
  size: 512,
  scale: 55,
  spacing: 0,
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

function toNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && raw.trim() !== '') return Number(raw);
  return Number.NaN;
}

/** Validate an untrusted partial; invalid fields are dropped. */
export function validatePartial(p: UntrustedState): Partial<LogoState> {
  const out: Partial<LogoState> = {};
  if (typeof p.text === 'string') out.text = sanitizeText(p.text);
  if (typeof p.uppercase === 'boolean') out.uppercase = p.uppercase;
  if (isShape(p.shape)) out.shape = p.shape;
  if (isFill(p.fill)) out.fill = p.fill;
  if (isFontId(p.fontId)) out.fontId = p.fontId;
  for (const key of ['bgColor', 'bgColor2', 'fgColor'] as const) {
    const v = p[key];
    const hex = typeof v === 'string' ? parseHex(v) : null;
    if (hex) out[key] = hex;
  }
  for (const key of ['size', 'scale', 'spacing', 'gradientAngle'] as const) {
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
