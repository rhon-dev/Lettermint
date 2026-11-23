import { DEFAULTS, validatePartial, type LogoState } from '../store/logo';

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
  layout: 'ly',
  dx1: 'x1',
  dy1: 'y1',
  dx2: 'x2',
  dy2: 'y2',
  knockout: 'ko',
  brandName: 'n',
} as const satisfies Record<keyof LogoState, string>;

const COLORS = new Set<keyof LogoState>(['bgColor', 'bgColor2', 'fgColor', 'fgColor2']);

/** Links written by this version carry `v=2`; links without it predate letter positions. */
export const SHARE_VERSION = 2;
/**
 * Fields added in version 2, with the values that reproduce how older links rendered.
 * A link that lacks them gets these, never the autosaved or default values.
 */
const V1_COMPOSITION = { layout: 'row', dx1: 0, dy1: 0, dx2: 0, dy2: 0, knockout: 0 } as const satisfies Partial<LogoState>;

/** Encode state as a URL hash payload, e.g. `t=LM&sh=circle&bg=111111…`. */
export function encodeState(state: LogoState): string {
  const p = new URLSearchParams({ v: String(SHARE_VERSION) });
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

/** Give saved or shared state from before version 2 the composition it was drawn with. */
export function withV1Composition(state: Partial<LogoState>): Partial<LogoState> {
  const out = { ...state };
  for (const [field, value] of Object.entries(V1_COMPOSITION)) if (!(field in out)) Object.assign(out, { [field]: value });
  return out;
}

/**
 * Read a share link. `damaged` means the hash had content but nothing in it was usable,
 * so the caller keeps the current (autosaved or default) logo and can tell the user.
 */
export function readShareHash(hash: string): { state: Partial<LogoState>; damaged: boolean } {
  if (hash.replace(/^#/, '') === '') return { state: {}, damaged: false };
  const state = validatePartial(decodeState(hash));
  if (Object.keys(state).length === 0) return { state, damaged: true };
  // A link describes one whole composition: missing position fields mean "not moved".
  return { state: withV1Composition(state), damaged: false };
}
