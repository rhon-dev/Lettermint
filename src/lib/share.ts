import type { LogoState } from '../store/logo';

/** Short URL keys; order is the encoding order. */
const KEYS = {
  text: 't',
  uppercase: 'u',
  shape: 'sh',
  fontId: 'f',
  bgColor: 'bg',
  bgColor2: 'bg2',
  fill: 'fl',
  gradientAngle: 'ga',
  fgColor: 'fg',
  size: 's',
  scale: 'k',
  spacing: 'sp',
} as const satisfies Record<keyof LogoState, string>;

/** Encode state as a URL hash payload, e.g. `t=LM&sh=circle&bg=111111…`. */
export function encodeState(state: LogoState): string {
  const p = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS) as [keyof LogoState, string][]) {
    const v = state[field];
    if (typeof v === 'boolean') p.set(key, v ? '1' : '0');
    else if (typeof v === 'string' && v.startsWith('#')) p.set(key, v.slice(1));
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
    if (field === 'uppercase') out.uppercase = raw === '1';
    else if (field === 'bgColor' || field === 'bgColor2' || field === 'fgColor') out[field] = `#${raw}`;
    else if (field === 'size' || field === 'scale' || field === 'spacing' || field === 'gradientAngle')
      out[field] = Number(raw);
    else out[field] = raw;
  }
  return out;
}
