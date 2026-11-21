import { DEFAULTS, type LogoState } from '../store/logo';

/** Short URL keys; order is the encoding order. */
const KEYS = {
  text: 't',
  uppercase: 'u',
  shape: 'sh',
  radius: 'r',
  blobSeed: 'bs',
  ring: 'rg',
  fontId: 'f',
  weight: 'w',
  bgColor: 'bg',
  bgColor2: 'bg2',
  fill: 'fl',
  gradientAngle: 'ga',
  fgColor: 'fg',
  fgColor2: 'fg2',
  fgFill: 'ff',
  letterStyle: 'ls',
  stroke: 'st',
  size: 's',
  scale: 'k',
  spacing: 'sp',
  shift: 'sy',
  rotate1: 'r1',
  rotate2: 'r2',
} as const satisfies Record<keyof LogoState, string>;

const COLORS = new Set<keyof LogoState>(['bgColor', 'bgColor2', 'fgColor', 'fgColor2']);

/** Encode state as a URL hash payload, e.g. `t=LM&sh=circle&bg=111111…`. */
export function encodeState(state: LogoState): string {
  const p = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS) as [keyof LogoState, string][]) {
    const v = state[field];
    if (typeof v === 'boolean') p.set(key, v ? '1' : '0');
    else if (COLORS.has(field)) p.set(key, String(v).slice(1));
    else p.set(key, String(v));
  }
  return p.toString();
}

/**
 * Decode an untrusted hash payload into raw values. The result must still go
 * through the store's validators (`apply`), which drop anything invalid.
 */
export function decodeState(hash: string): Partial<Record<keyof LogoState, unknown>> {
  const p = new URLSearchParams(hash.replace(/^#/, ''));
  const out: Partial<Record<keyof LogoState, unknown>> = {};
  for (const [field, key] of Object.entries(KEYS) as [keyof LogoState, string][]) {
    const raw = p.get(key);
    if (raw === null) continue;
    const kind = typeof DEFAULTS[field];
    if (kind === 'boolean') out[field] = raw === '1';
    else if (COLORS.has(field)) out[field] = `#${raw}`;
    else if (kind === 'number') out[field] = Number(raw);
    else out[field] = raw;
  }
  return out;
}
