/** Phase 4 brand kit: palette, lockups, OG image and the text files of the ZIP. Pure; no DOM. */
import { commandsBox, layoutGlyphs, toPathData, transformCommands, type GlyphFont, type LogoGeometry } from './buildLogo';
import { contrastRatio, hexToRgb, relativeLuminance } from './color';
import type { Shape } from './shapes';
import { fmt } from './shapes';
import { escapeAttr, logoSvgBody, type Paint } from './svg';

export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type Step = (typeof STEPS)[number];

/** Steps away from the anchor (500) toward the light or dark end. */
const DISTANCE: Record<Step, number> = { 50: 5, 100: 4, 200: 3, 300: 2, 400: 1, 500: 0, 600: 1, 700: 2, 800: 3, 900: 4, 950: 5 };
/** Relative luminance at the ends of the scale. */
const LIGHT_END = 0.93;
const DARK_END = 0.01;
/**
 * The anchor's luminance is clamped so near-black, near-white and grey brand colours still get
 * five distinct tints and five distinct shades: every neighbour pair keeps a contrast of at least ~1.14.
 */
export const ANCHOR_LUMINANCE = { min: 0.07, max: 0.45 } as const;

export interface BrandPalette {
  /** The exact brand colour (exported as --brand). */
  base: string;
  scale: Record<Step, string>;
  complement: string;
}

const toHex = (rgb: readonly number[]) => `#${rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return toHex([(r + m) * 255, (g + m) * 255, (b + m) * 255]);
}

/** Same saturation and lightness, hue + 180°. */
function complement(hex: string): string {
  const [h, s, l] = toHsl(hex);
  return s === 0 ? hex : fromHsl((h + 180) % 360, s, l);
}

/** HSL lightness that gives hue/saturation `h, s` the target relative luminance (luminance rises with lightness). */
function withLuminance(h: number, s: number, target: number): string {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (relativeLuminance(fromHsl(h, s, mid)) < target) lo = mid;
    else hi = mid;
  }
  return fromHsl(h, s, (lo + hi) / 2);
}

export function brandPalette(base: string): BrandPalette {
  const [h, s] = toHsl(base);
  const y = relativeLuminance(base);
  const anchor = Math.min(ANCHOR_LUMINANCE.max, Math.max(ANCHOR_LUMINANCE.min, y));
  // Equal contrast ratios between neighbours: geometric steps in (Y + 0.05), as in the WCAG formula.
  const scale = {} as Record<Step, string>;
  for (const step of STEPS) {
    const end = step < 500 ? LIGHT_END : DARK_END;
    const t = DISTANCE[step] / 5;
    const target = (anchor + 0.05) * ((end + 0.05) / (anchor + 0.05)) ** t - 0.05;
    scale[step] = step === 500 && anchor === y ? base : withLuminance(h, s, target);
  }
  return { base, scale, complement: complement(base) };
}

/** Brand colour of a mark: the shape colour, or the letter colour when there is no shape. */
export function inkColor(state: { shape: Shape; bgColor: string; fgColor: string }): string {
  return state.shape === 'none' ? state.fgColor : state.bgColor;
}

/** Readable text colour on top of the brand colour. */
export function onColor(ink: string): string {
  return contrastRatio(ink, '#ffffff') >= contrastRatio(ink, '#111111') ? '#ffffff' : '#111111';
}

/** Light tint or dark shade, whichever contrasts more with the ink. */
export function ogBackground(p: BrandPalette, ink: string): string {
  return contrastRatio(p.scale[50], ink) >= contrastRatio(p.scale[950], ink) ? p.scale[50] : p.scale[950];
}

export function paletteCss(p: BrandPalette, on: string): string {
  const lines = STEPS.map((s) => `  --brand-${s}: ${p.scale[s]};`);
  return `:root {\n  --brand: ${p.base};\n${lines.join('\n')}\n  --brand-on: ${on};\n  --brand-complement: ${p.complement};\n}\n`;
}

export function tailwindConfig(p: BrandPalette, on: string): string {
  const lines = STEPS.map((s) => `          ${s}: '${p.scale[s]}',`);
  return (
    `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n` +
    `        brand: {\n          DEFAULT: '${p.base}',\n${lines.join('\n')}\n          on: '${on}',\n          complement: '${p.complement}',\n        },\n` +
    `      },\n    },\n  },\n};\n`
  );
}

export function webManifest(name: string, theme: string, background: string): string {
  const icons = [192, 512].map((n) => ({ src: `icon-${n}.png`, sizes: `${n}x${n}`, type: 'image/png' }));
  return `${JSON.stringify({ name, short_name: name.slice(0, 12), icons, theme_color: theme, background_color: background, display: 'standalone' }, null, 2)}\n`;
}

export type LockupLayout = 'horizontal' | 'stacked';

export interface Lockup {
  width: number;
  height: number;
  /** Inner markup in a 0 0 width height coordinate space. */
  body: string;
  svg: string;
}

function wrap(width: number, height: number, title: string, body: string): string {
  const w = fmt(width);
  const h = fmt(height);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img"><title>${escapeAttr(title)}</title>${body}</svg>`;
}

/** Mark plus the brand name set in the mark's font, converted to paths so the file needs no fonts. */
export function buildLockup(
  state: Paint & { shape: Shape },
  geo: LogoGeometry,
  font: GlyphFont,
  name: string,
  layout: LockupLayout,
): Lockup {
  const M = state.size;
  const mark = (x: number, y: number) => `<g transform="translate(${fmt(x)} ${fmt(y)})">${logoSvgBody(state, geo, 'lk')}</g>`;
  const cmds = name ? layoutGlyphs(font, name, 0) : [];
  const box = commandsBox(cmds);
  if (!box) return { width: M, height: M, body: mark(0, 0), svg: wrap(M, M, name, mark(0, 0)) };

  const upm = font.unitsPerEm;
  const fill = inkColor(state);
  const text = (k: number, tx: number, ty: number) => `<path d="${toPathData(transformCommands(cmds, k, tx, ty))}" fill="${fill}"/>`;
  let width: number;
  let height: number;
  let body: string;
  if (layout === 'horizontal') {
    const k = (M * 0.5) / upm;
    const gap = M * 0.22;
    const capHeight = (font.tables.os2?.sCapHeight || upm * 0.7) * k;
    // Center the cap height on the mark, then make room for any accent or descender outside it.
    const baseline = M / 2 + capHeight / 2;
    const top = Math.min(0, baseline + box.y1 * k);
    const dy = -top;
    width = M + gap + (box.x2 - box.x1) * k;
    height = Math.max(M, baseline + box.y2 * k) + dy;
    body = mark(0, dy) + text(k, M + gap - box.x1 * k, baseline + dy);
  } else {
    const k = (M * 0.3) / upm;
    const gap = M * 0.12;
    const textW = (box.x2 - box.x1) * k;
    width = Math.max(M, textW);
    height = M + gap + (box.y2 - box.y1) * k;
    body = mark((width - M) / 2, 0) + text(k, (width - textW) / 2 - box.x1 * k, M + gap - box.y1 * k);
  }
  return { width, height, body, svg: wrap(width, height, name, body) };
}

export const OG = { width: 1200, height: 630, pad: 100 } as const;

/** 1200×630 social preview: the lockup centered on a solid background. */
export function ogSvg(lockup: Lockup, background: string): string {
  const s = Math.min((OG.width - OG.pad * 2) / lockup.width, (OG.height - OG.pad * 2) / lockup.height);
  const x = (OG.width - lockup.width * s) / 2;
  const y = (OG.height - lockup.height * s) / 2;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${OG.width} ${OG.height}" width="${OG.width}" height="${OG.height}">` +
    `<rect width="${OG.width}" height="${OG.height}" fill="${background}"/>` +
    `<g transform="translate(${fmt(x)} ${fmt(y)}) scale(${fmt(s)})">${lockup.body}</g></svg>`
  );
}

/** Mark on an opaque square, for icons that platforms fill with black when transparent (Apple touch icon). */
export function opaqueIconSvg(paint: Paint, geo: LogoGeometry, background: string): string {
  const s = paint.size;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${geo.viewBox}" width="${s}" height="${s}"><rect width="${s}" height="${s}" fill="${background}"/>${logoSvgBody(paint, geo)}</svg>`;
}

/** Raster files of the kit: [file name, pixel size, opaque background?]. */
export const KIT_PNGS = [
  ['favicon-16.png', 16, false],
  ['favicon-32.png', 32, false],
  ['apple-touch-icon.png', 180, true],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['avatar-400.png', 400, false],
] as const;

export const ICO_SIZES = [16, 32, 48] as const;

export interface KitText {
  name: string;
  text: string;
}

export function kitTextFiles(o: { name: string; ink: string; on: string; logoSvg: string; lockups: readonly KitText[] }): KitText[] {
  const p = brandPalette(o.ink);
  const lockupLines = o.lockups.map((l) => `  ${l.name.padEnd(22)} mark and name lockup (fonts converted to paths)`);
  const readme = [
    `${o.name} brand kit, made with Lettermint.`,
    '',
    'Files',
    '  logo.svg               vector mark',
    ...lockupLines,
    '  favicon.ico            16, 32 and 48 px',
    '  favicon-16/32.png      browser tab icons',
    '  apple-touch-icon.png   180 px, iOS home screen',
    '  icon-192/512.png       PWA and Android icons',
    '  avatar-400.png         social profile picture',
    '  og-image.png           1200x630 link preview',
    '  site.webmanifest       PWA manifest',
    '  palette.css            brand colours as CSS variables',
    '  tailwind.config.js     the same colours for Tailwind',
    '',
    'Paste into <head>',
    '  <link rel="icon" href="/favicon.ico" sizes="48x48">',
    '  <link rel="icon" href="/logo.svg" type="image/svg+xml">',
    '  <link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '  <link rel="manifest" href="/site.webmanifest">',
    '  <meta property="og:image" content="https://YOUR-SITE/og-image.png">',
    '',
  ].join('\n');
  return [
    { name: 'logo.svg', text: o.logoSvg },
    ...o.lockups,
    { name: 'site.webmanifest', text: webManifest(o.name, o.ink, ogBackground(p, o.ink)) },
    { name: 'palette.css', text: paletteCss(p, o.on) },
    { name: 'tailwind.config.js', text: tailwindConfig(p, o.on) },
    { name: 'README.txt', text: readme },
  ];
}
