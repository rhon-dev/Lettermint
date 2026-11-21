import interUrl from '@fontsource/inter/files/inter-latin-700-normal.woff?url';
import manropeUrl from '@fontsource/manrope/files/manrope-latin-700-normal.woff?url';
import plusJakartaUrl from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-700-normal.woff?url';
import dmSansUrl from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff?url';
import spaceGroteskUrl from '@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff?url';
import soraUrl from '@fontsource/sora/files/sora-latin-700-normal.woff?url';
import outfitUrl from '@fontsource/outfit/files/outfit-latin-700-normal.woff?url';
import bricolageUrl from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-700-normal.woff?url';
import syneUrl from '@fontsource/syne/files/syne-latin-700-normal.woff?url';
import unboundedUrl from '@fontsource/unbounded/files/unbounded-latin-700-normal.woff?url';
import frauncesUrl from '@fontsource/fraunces/files/fraunces-latin-600-normal.woff?url';
import jetbrainsMonoUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff?url';

export interface FontDef {
  id: string;
  family: string;
  weight: 600 | 700;
  /** @fontsource package name (without scope). */
  pkg: string;
  /** Self-hosted WOFF file URL (opentype.js cannot read WOFF2). */
  url: string;
}

// WOFF URLs are only strings here; the files are fetched lazily on first use.
export const FONTS = [
  { id: 'inter', family: 'Inter', weight: 700, pkg: 'inter', url: interUrl },
  { id: 'manrope', family: 'Manrope', weight: 700, pkg: 'manrope', url: manropeUrl },
  { id: 'plus-jakarta-sans', family: 'Plus Jakarta Sans', weight: 700, pkg: 'plus-jakarta-sans', url: plusJakartaUrl },
  { id: 'dm-sans', family: 'DM Sans', weight: 700, pkg: 'dm-sans', url: dmSansUrl },
  { id: 'space-grotesk', family: 'Space Grotesk', weight: 700, pkg: 'space-grotesk', url: spaceGroteskUrl },
  { id: 'sora', family: 'Sora', weight: 700, pkg: 'sora', url: soraUrl },
  { id: 'outfit', family: 'Outfit', weight: 700, pkg: 'outfit', url: outfitUrl },
  { id: 'bricolage-grotesque', family: 'Bricolage Grotesque', weight: 700, pkg: 'bricolage-grotesque', url: bricolageUrl },
  { id: 'syne', family: 'Syne', weight: 700, pkg: 'syne', url: syneUrl },
  { id: 'unbounded', family: 'Unbounded', weight: 700, pkg: 'unbounded', url: unboundedUrl },
  { id: 'fraunces', family: 'Fraunces', weight: 600, pkg: 'fraunces', url: frauncesUrl },
  { id: 'jetbrains-mono', family: 'JetBrains Mono', weight: 700, pkg: 'jetbrains-mono', url: jetbrainsMonoUrl },
] as const satisfies readonly FontDef[];

export type FontId = (typeof FONTS)[number]['id'];

export const DEFAULT_FONT_ID: FontId = 'inter';

export function isFontId(value: unknown): value is FontId {
  return FONTS.some((f) => f.id === value);
}

export function getFontDef(id: FontId): FontDef {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
