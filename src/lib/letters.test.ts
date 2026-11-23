import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { DEFAULTS, useLogoStore, validatePartial, type LogoState } from '../store/logo';
import { buildLogo, commandsBox } from './buildLogo';
import { composeStarter } from './compose';
import { decodeState, encodeState, readShareHash, withLetterDefaults } from './share';
import { logoSvgBody } from './svg';

const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTestFont(pkg: string, weight: number): Font {
  const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}
const inter = loadTestFont('inter', 700);
const fraunces = loadTestFont('fraunces', 600);
const mono = loadTestFont('jetbrains-mono', 500);
const plain: LogoState = { ...DEFAULTS, text: 'AR', shape: 'square', spacing: 0, shift: 0, knockout: 0 };

describe('per-letter typefaces', () => {
  it('draws exactly the old mark when both letters share one font', () => {
    expect(buildLogo(plain, inter, inter).glyphPath).toBe(buildLogo(plain, inter).glyphPath);
  });

  it('draws the second letter from the second font and leaves the first letter alone', () => {
    const same = buildLogo(plain, inter, inter);
    const mixed = buildLogo(plain, inter, fraunces);
    expect(mixed.letters[1]!.d).not.toBe(same.letters[1]!.d);
    // Fitting may rescale, so compare the first letter's shape relative to its own box.
    const shape = (d: string) => d.replace(/[\d.-]+/g, '#');
    expect(shape(mixed.letters[0]!.d)).toBe(shape(same.letters[0]!.d));
  });

  it('normalises fonts with different units per em to the first font', () => {
    // JetBrains Mono uses 1000 units per em, Inter 2048: both letters should still be cap-height alike.
    const geo = buildLogo({ ...plain, text: 'II' }, inter, mono);
    const [a, b] = geo.letters.map((l) => l.box!);
    const ha = a!.y2 - a!.y1;
    const hb = b!.y2 - b!.y1;
    expect(hb / ha).toBeGreaterThan(0.85);
    expect(hb / ha).toBeLessThan(1.15);
  });

  it('scales the second letter by scale2', () => {
    const geo = buildLogo({ ...plain, text: 'II', scale2: 50 }, inter, inter);
    const [a, b] = geo.letters.map((l) => l.box!);
    expect((b!.y2 - b!.y1) / (a!.y2 - a!.y1)).toBeCloseTo(0.5, 2);
  });

  it('measures the starter composition with the second font and size', () => {
    const p = composeStarter('side', inter, 'AR', { font: mono, scale: 0.6 });
    const geo = buildLogo({ ...plain, ...p, scale2: 60 }, inter, mono);
    const [a, b] = geo.letters.map((l) => l.box!);
    expect(b!.x1).toBeGreaterThan(a!.x2); // side by side: no overlap
  });
});

describe('two-tone and layer order', () => {
  const geo = buildLogo({ ...plain, knockout: 16, spacing: -20 }, inter, inter);
  const paint = { ...plain, knockout: 16 };

  it('paints the second letter in its own colour when two-tone is on', () => {
    const svg = logoSvgBody({ ...paint, twoTone: true, secondColor: '#0f766e' }, geo);
    expect(svg).toContain(`d="${geo.letters[1]!.d}" fill="#0f766e"`);
    expect(svg).toContain(`fill="${plain.fgColor}"`);
  });

  it('keeps one colour when two-tone is off', () => {
    expect(logoSvgBody({ ...paint, twoTone: false, secondColor: '#0f766e' }, geo)).not.toContain('#0f766e');
  });

  it('puts the first letter on top and cuts the gap into the second when firstOnTop', () => {
    const svg = logoSvgBody({ ...paint, firstOnTop: true }, geo);
    const firstAt = svg.lastIndexOf(`d="${geo.letters[0]!.d}" fill`);
    const secondAt = svg.lastIndexOf(`d="${geo.letters[1]!.d}" fill`);
    expect(firstAt).toBeGreaterThan(secondAt);
    // The mask holds the first (front) letter's outline.
    expect(svg).toMatch(new RegExp(`<mask[^]*d="${geo.letters[0]!.d.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });
});

describe('share links with per-letter fields', () => {
  it('round-trips the new fields', () => {
    const state: LogoState = { ...DEFAULTS, fontId2: 'jetbrains-mono', weight2: 500, scale2: 62, twoTone: true, secondColor: '#0f766e', firstOnTop: true };
    expect(validatePartial(decodeState(encodeState(state)))).toEqual(state);
  });

  it('gives a link from before per-letter fields one typeface, one colour and the old layering', () => {
    const old =
      '#v=2&t=AR&u=1&sh=circle&r=22&bs=7&rg=0&f=inter&w=600&bg=111111&bg2=047857&fl=solid&ga=135&fg=ffffff&fg2=a7f3d0&ff=solid&ls=fill&st=30&s=512&k=55&sp=-6&sy=12&r1=0&r2=8&ly=row&x1=0&y1=0&x2=0&y2=0&ko=0&n=';
    // An autosave with a mixed design must not leak into the old link.
    useLogoStore.getState().apply({ fontId2: 'syne', weight2: 800, scale2: 40, twoTone: true, firstOnTop: true });
    useLogoStore.getState().apply(readShareHash(old).state);
    expect(useLogoStore.getState()).toMatchObject({ fontId: 'inter', weight: 600, fontId2: 'inter', weight2: 600, scale2: 100, twoTone: false, firstOnTop: false });
    useLogoStore.getState().reset();
  });

  it('gives an autosave from before per-letter fields the same neutral values', () => {
    const saved = validatePartial({ ...DEFAULTS, fontId: 'sora', weight: 700, fontId2: undefined, weight2: undefined, scale2: undefined });
    expect(withLetterDefaults(saved)).toMatchObject({ fontId2: 'sora', weight2: 700, scale2: 100, twoTone: false, firstOnTop: false });
  });

  it('drops hostile per-letter values', () => {
    expect(validatePartial(decodeState('f2=comic-sans&w2=950&k2=1e9&tt=yes&c2=zzz'))).toEqual({ scale2: 160, twoTone: false });
  });
});

describe('fitting', () => {
  it('keeps a mixed pair inside the canvas', () => {
    const geo = buildLogo({ ...plain, text: 'MW', scale: 90, scale2: 160 }, inter, fraunces);
    const box = commandsBox(geo.glyphCommands)!;
    expect(box.x1).toBeGreaterThanOrEqual(0);
    expect(box.x2).toBeLessThanOrEqual(plain.size);
  });
});
