// Static WOFF weights from @fontsource (opentype.js cannot read WOFF2, and the
// variable packages ship WOFF2 only). Vite emits each file; they are fetched lazily.
const FILES = import.meta.glob('/node_modules/@fontsource/*/files/*-latin-[45678]00-normal.woff', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export const WEIGHTS = [400, 500, 600, 700, 800] as const;
export type Weight = (typeof WEIGHTS)[number];

export const WEIGHT_LABELS: Record<Weight, string> = {
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extrabold',
};

export interface FontDef {
  id: string;
  family: string;
  /** Recommended display weight. */
  weight: 600 | 700;
  /** @fontsource package name (without scope). */
  pkg: string;
}

export const FONTS = [
  { id: 'inter', family: 'Inter', weight: 700, pkg: 'inter' },
  { id: 'manrope', family: 'Manrope', weight: 700, pkg: 'manrope' },
  { id: 'plus-jakarta-sans', family: 'Plus Jakarta Sans', weight: 700, pkg: 'plus-jakarta-sans' },
  { id: 'dm-sans', family: 'DM Sans', weight: 700, pkg: 'dm-sans' },
  { id: 'space-grotesk', family: 'Space Grotesk', weight: 700, pkg: 'space-grotesk' },
  { id: 'sora', family: 'Sora', weight: 700, pkg: 'sora' },
  { id: 'outfit', family: 'Outfit', weight: 700, pkg: 'outfit' },
  { id: 'bricolage-grotesque', family: 'Bricolage Grotesque', weight: 700, pkg: 'bricolage-grotesque' },
  { id: 'syne', family: 'Syne', weight: 700, pkg: 'syne' },
  { id: 'unbounded', family: 'Unbounded', weight: 700, pkg: 'unbounded' },
  { id: 'fraunces', family: 'Fraunces', weight: 600, pkg: 'fraunces' },
  { id: 'jetbrains-mono', family: 'JetBrains Mono', weight: 700, pkg: 'jetbrains-mono' },
] as const satisfies readonly FontDef[];

export type FontId = (typeof FONTS)[number]['id'];

export const DEFAULT_FONT_ID: FontId = 'inter';

export function isFontId(value: unknown): value is FontId {
  return FONTS.some((f) => f.id === value);
}

export function isWeight(value: unknown): value is Weight {
  return (WEIGHTS as readonly unknown[]).includes(value);
}

export function getFontDef(id: FontId): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}

function fileKey(pkg: string, weight: number): string {
  return `/node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`;
}

export function availableWeights(id: FontId): Weight[] {
  const { pkg } = getFontDef(id);
  return WEIGHTS.filter((w) => fileKey(pkg, w) in FILES);
}

/** The requested weight when the family ships it, otherwise the closest one (ties go heavier). */
export function nearestWeight(id: FontId, weight: Weight): Weight {
  const list = availableWeights(id);
  return list.reduce((best, w) => (Math.abs(w - weight) <= Math.abs(best - weight) ? w : best), list[0]!);
}

export function fontUrl(id: FontId, weight: Weight): string {
  return FILES[fileKey(getFontDef(id).pkg, nearestWeight(id, weight))]!;
}
