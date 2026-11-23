/** The named gallery designs. Each one is a full LogoState, so tiles, editor, links and exports agree. */
import type { FontId, Weight } from '../fonts/registry';
import { DEFAULTS, LIMITS, clampStep, type LogoState } from '../store/logo';
import { buildLogo, type GlyphFont } from './buildLogo';
import { composeStarter, type Composition, type CompositionPatch } from './compose';
import { MAX_CHARS, sanitizeText } from './sanitize';

export type StyleTag = 'serif' | 'sans' | 'framed' | 'mixed';
export type StyleFilter = 'all' | StyleTag;

export const STYLE_FILTERS: readonly { id: StyleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'serif', label: 'Serif' },
  { id: 'sans', label: 'Sans' },
  { id: 'framed', label: 'Framed' },
  { id: 'mixed', label: 'Mixed type' },
];

type Face = { id: FontId; weight: Weight };

export interface Design {
  id: string;
  name: string;
  /** One short line under the tile. */
  note: string;
  tags: StyleTag[];
  composition: Composition;
  fonts: [Face, Face];
  /** Paint and shape; anything not listed comes from DEFAULTS. */
  look: Partial<LogoState>;
  /** Adjust the measured starter (em-relative, so it holds for any pair of letters). */
  tweak?: (p: CompositionPatch) => Partial<CompositionPatch>;
}

// Specimen-book palette: paper, ink and one restrained mint.
const PAPER = '#f1e9d8';
const PAPER_DEEP = '#e6dcc6';
const INK = '#1a1917';
const MINT = '#0f6e56';
/** Ink margin each design keeps from the canvas edge, as a fraction of the side. */
const MARGIN = 0.07;
const spacing = (n: number) => clampStep(n, LIMITS.spacing) ?? 0;

export const DESIGNS: readonly Design[] = [
  {
    id: 'interlace',
    name: 'Interlace',
    note: 'Serif letters woven together',
    tags: ['serif'],
    composition: 'overlap',
    fonts: [{ id: 'fraunces', weight: 600 }, { id: 'fraunces', weight: 600 }],
    look: { shape: 'square', bgColor: PAPER, fgColor: INK, scale: 60 },
  },
  {
    id: 'ink-column',
    name: 'Ink Column',
    note: 'A dense stack reversed out of ink',
    tags: ['sans'],
    composition: 'stack',
    fonts: [{ id: 'unbounded', weight: 800 }, { id: 'unbounded', weight: 800 }],
    look: { shape: 'square', bgColor: INK, fgColor: PAPER, scale: 76 },
    tweak: (p) => ({ spacing: spacing(Math.round(p.spacing * 0.6)) }),
  },
  {
    id: 'two-hands',
    name: 'Two Hands',
    note: 'A serif capital with a mono companion',
    tags: ['serif', 'mixed'],
    composition: 'overlap',
    fonts: [{ id: 'fraunces', weight: 800 }, { id: 'jetbrains-mono', weight: 500 }],
    look: { shape: 'square', bgColor: PAPER, fgColor: INK, scale: 62, scale2: 62, twoTone: true, secondColor: MINT },
  },
  {
    id: 'open-pair',
    name: 'Open Pair',
    note: 'Light letters with room to breathe',
    tags: ['sans'],
    composition: 'side',
    fonts: [{ id: 'manrope', weight: 400 }, { id: 'manrope', weight: 400 }],
    look: { shape: 'square', bgColor: '#faf7f0', fgColor: INK, scale: 30 },
    tweak: (p) => ({ spacing: spacing(p.spacing + 24) }),
  },
  {
    id: 'seal',
    name: 'Seal',
    note: 'A serif pair inside a ringed seal',
    tags: ['serif', 'framed'],
    composition: 'side',
    fonts: [{ id: 'fraunces', weight: 700 }, { id: 'fraunces', weight: 700 }],
    look: { shape: 'circle', ring: true, bgColor: '#1f3d36', fgColor: '#efe6d2', scale: 40 },
  },
  {
    id: 'tracing',
    name: 'Tracing',
    note: 'Outlines that cross in the open',
    tags: ['sans'],
    composition: 'overlap',
    fonts: [{ id: 'bricolage-grotesque', weight: 800 }, { id: 'bricolage-grotesque', weight: 800 }],
    look: { shape: 'square', bgColor: PAPER, fgColor: INK, letterStyle: 'outline', stroke: 20, scale: 64 },
    tweak: () => ({ knockout: 0 }),
  },
  {
    id: 'crest',
    name: 'Crest',
    note: 'Stacked letters on a shield',
    tags: ['sans', 'framed'],
    composition: 'stack',
    fonts: [{ id: 'syne', weight: 700 }, { id: 'syne', weight: 700 }],
    look: { shape: 'shield', bgColor: INK, fgColor: '#e9dfc9', scale: 50 },
  },
  {
    id: 'drop-cap',
    name: 'Drop Cap',
    note: 'A tall capital with a small partner',
    tags: ['serif', 'mixed'],
    composition: 'side',
    fonts: [{ id: 'fraunces', weight: 800 }, { id: 'dm-sans', weight: 600 }],
    look: { shape: 'square', bgColor: PAPER_DEEP, fgColor: INK, scale: 66, scale2: 42, twoTone: true, secondColor: MINT },
  },
  {
    id: 'tilt',
    name: 'Tilt',
    note: 'Letters leaning in step',
    tags: ['sans', 'framed'],
    composition: 'side',
    fonts: [{ id: 'sora', weight: 800 }, { id: 'sora', weight: 800 }],
    look: { shape: 'rounded', radius: 28, bgColor: MINT, fgColor: PAPER, rotate1: 9, rotate2: 9, scale: 46 },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    note: 'Monospaced initials in a pill',
    tags: ['sans', 'framed'],
    composition: 'side',
    fonts: [{ id: 'jetbrains-mono', weight: 700 }, { id: 'jetbrains-mono', weight: 700 }],
    look: { shape: 'pill', bgColor: INK, fgColor: '#8fe3c4', scale: 36 },
  },
];

/** The three designs the opening screen shows as live specimens. */
export const SPECIMENS = ['interlace', 'ink-column', 'two-hands'] as const;
/** Shown before the visitor types, one per specimen. */
export const SPECIMEN_EXAMPLES = ['EM', 'JK', 'SO'] as const;

export function getDesign(id: string): Design | undefined {
  return DESIGNS.find((d) => d.id === id);
}

export function designFonts(d: Design): [Face, Face] {
  return d.fonts;
}

export function filterDesigns(filter: StyleFilter): readonly Design[] {
  return filter === 'all' ? DESIGNS : DESIGNS.filter((d) => d.tags.includes(filter));
}

/** The complete logo for a design and a pair of initials, composed from the measured letters. */
export function designState(d: Design, text: string, font: GlyphFont, font2: GlyphFont): LogoState {
  const [a, b] = d.fonts;
  const look: LogoState = { ...DEFAULTS, ...d.look };
  // Designs draw uppercase, so measure (and store) the uppercase letters.
  const upper = sanitizeText(text).toUpperCase();
  const composed = composeStarter(d.composition, font, upper, { font: font2, scale: look.scale2 / 100 });
  const state: LogoState = {
    ...look,
    text: upper,
    uppercase: true,
    fontId: a.id,
    weight: a.weight,
    fontId2: b.id,
    weight2: b.weight,
    ...composed,
    ...d.tweak?.(composed),
    brandName: '',
  };
  // Wide pairs (MW) would otherwise run to the canvas edge: shrink until the ink keeps a margin.
  const box = buildLogo(state, font, font2).glyphBox;
  if (box) {
    // `scale` sets the ink height; the width follows the box's aspect ratio.
    const aspect = Math.max(1, (box.x2 - box.x1) / (box.y2 - box.y1));
    const fit = Math.floor(((1 - 2 * MARGIN) * 100) / aspect);
    if (fit < state.scale) state.scale = clampStep(fit, LIMITS.scale) ?? state.scale;
  }
  return state;
}

export const HEADLINE = 'Make a mark with your initials';
export const INITIALS_HINT = '1–2 characters: A–Z, 0–9 or &';
export const INITIALS_EMPTY = 'Enter one or two letters or numbers, like AR.';

/** Message for the initials field on submit, or null when the value can be explored. */
export function initialsError(raw: string): string | null {
  const n = Array.from(sanitizeText(raw)).length;
  return n >= 1 && n <= MAX_CHARS ? null : INITIALS_EMPTY;
}
