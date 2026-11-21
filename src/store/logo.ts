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
} as const satisfies Record<string, Range>;

export interface LogoState {
  /** Sanitized text in the case the user typed it. */
  text: string;
  uppercase: boolean;
  shape: Shape;
  bgColor: string;
  fgColor: string;
  fontId: FontId;
  size: number;
  scale: number;
  spacing: number;
}

export interface LogoActions {
  setText: (raw: string) => void;
  setUppercase: (on: boolean) => void;
  setShape: (shape: string) => void;
  setBgColor: (hex: string) => void;
  setFgColor: (hex: string) => void;
  setFontId: (id: string) => void;
  setSize: (n: number) => void;
  setScale: (n: number) => void;
  setSpacing: (n: number) => void;
  reset: () => void;
}

export const DEFAULTS: LogoState = {
  text: 'LM',
  uppercase: true,
  shape: 'circle',
  bgColor: '#111111',
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

export const useLogoStore = create<LogoState & LogoActions>()((set) => {
  const setNumber = (key: 'size' | 'scale' | 'spacing') => (n: number) => {
    const v = clampStep(n, LIMITS[key]);
    if (v !== null) set({ [key]: v });
  };
  const setColor = (key: 'bgColor' | 'fgColor') => (hex: string) => {
    const v = parseHex(hex);
    if (v) set({ [key]: v });
  };
  return {
    ...DEFAULTS,
    setText: (raw) => set({ text: sanitizeText(raw) }),
    setUppercase: (on) => set({ uppercase: on === true }),
    setShape: (shape) => {
      if (isShape(shape)) set({ shape });
    },
    setBgColor: setColor('bgColor'),
    setFgColor: setColor('fgColor'),
    setFontId: (id) => {
      if (isFontId(id)) set({ fontId: id });
    },
    setSize: setNumber('size'),
    setScale: setNumber('scale'),
    setSpacing: setNumber('spacing'),
    reset: () => set(DEFAULTS),
  };
});
