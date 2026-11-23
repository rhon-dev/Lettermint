import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { nearestWeight, type FontId, type Weight } from '../fonts/registry';
import { pickState, useLogoStore, validatePartial } from '../store/logo';
import { useUiStore } from '../store/ui';
import { buildLogo, commandsBox } from './buildLogo';
import { DESIGNS, designFonts, designState, filterDesigns, initialsError, STYLE_FILTERS } from './designs';
import { encodeState, readShareHash } from './share';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cache = new Map<string, Font>();
function font(id: FontId, weight: Weight): Font {
  const pkg = id;
  const w = nearestWeight(id, weight);
  const key = `${pkg}:${w}`;
  if (!cache.has(key)) {
    const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${w}-normal.woff`);
    cache.set(key, parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer));
  }
  return cache.get(key)!;
}
const fontsFor = (d: (typeof DESIGNS)[number]) => {
  const [a, b] = designFonts(d);
  return [font(a.id, a.weight), font(b.id, b.weight)] as const;
};

describe('gallery designs', () => {
  it('offers at least nine designs with unique ids and short names', () => {
    expect(DESIGNS.length).toBeGreaterThanOrEqual(9);
    expect(new Set(DESIGNS.map((d) => d.id)).size).toBe(DESIGNS.length);
    expect(new Set(DESIGNS.map((d) => d.name)).size).toBe(DESIGNS.length);
    for (const d of DESIGNS) expect(d.name.length).toBeLessThanOrEqual(16);
  });

  it('builds genuinely different constructions, not recolours', () => {
    const sig = (d: (typeof DESIGNS)[number]) => {
      const s = designState(d, 'AR', ...fontsFor(d));
      return [s.layout, s.shape, s.knockout > 0, s.ring, s.letterStyle, s.scale2 !== 100, s.fontId === s.fontId2, s.rotate1 !== 0, s.spacing > 20].join('|');
    };
    const sigs = DESIGNS.map(sig);
    expect(new Set(sigs).size).toBe(DESIGNS.length);
    const kinds = new Set(DESIGNS.map((d) => d.composition));
    expect(kinds).toEqual(new Set(['side', 'overlap', 'stack']));
    expect(DESIGNS.some((d) => d.look.ring)).toBe(true);
    expect(DESIGNS.some((d) => designFonts(d)[0].id !== designFonts(d)[1].id)).toBe(true);
  });

  it('produces complete, valid state that survives a share link unchanged', () => {
    for (const d of DESIGNS) {
      const s = designState(d, 'AR', ...fontsFor(d));
      expect(validatePartial(s)).toEqual(s);
      expect(readShareHash(`#${encodeState(s)}`).state).toEqual(s);
    }
  });

  it('composes lowercase input from the uppercase letters it draws', () => {
    for (const d of DESIGNS) {
      const [f1, f2] = fontsFor(d);
      expect({ ...designState(d, 'ar', f1, f2), text: 'AR' }).toEqual(designState(d, 'AR', f1, f2));
    }
  });

  it('opens in the editor exactly as the tile shows it', () => {
    const d = DESIGNS.find((x) => designFonts(x)[0].id !== designFonts(x)[1].id)!;
    const s = designState(d, 'AR', ...fontsFor(d));
    useLogoStore.setState({ dx2: 999, brandName: 'Old', fontId2: 'syne' });
    useLogoStore.getState().apply(s);
    expect(pickState(useLogoStore.getState())).toEqual(s);
    useLogoStore.getState().reset();
  });

  it('keeps every design on the canvas for narrow, wide, mixed and single initials', () => {
    for (const text of ['II', 'MW', 'AR', 'A', '8&']) {
      for (const d of DESIGNS) {
        const [f1, f2] = fontsFor(d);
        const s = designState(d, text, f1, f2);
        const geo = buildLogo(s, f1, f2);
        const box = commandsBox(geo.glyphCommands);
        expect(box, `${d.id} ${text}`).not.toBeNull();
        expect(box!.x1, `${d.id} ${text}`).toBeGreaterThanOrEqual(-0.5);
        expect(box!.y1, `${d.id} ${text}`).toBeGreaterThanOrEqual(-0.5);
        expect(box!.x2, `${d.id} ${text}`).toBeLessThanOrEqual(s.size + 0.5);
        expect(box!.y2, `${d.id} ${text}`).toBeLessThanOrEqual(s.size + 0.5);
        // A quiet margin on every side, so tiles and exports never look cropped.
        const m = s.size * 0.06;
        expect([box!.x1, box!.y1, s.size - box!.x2, s.size - box!.y2].every((v) => v >= m), `${d.id} ${text} margin`).toBe(true);
        // Never a speck: the mark uses a real share of the tile.
        expect(Math.max(box!.x2 - box!.x1, box!.y2 - box!.y1), `${d.id} ${text}`).toBeGreaterThan(s.size * 0.25);
      }
    }
  });

  it('filters by style, and every filter has at least two designs', () => {
    expect(filterDesigns('all')).toEqual(DESIGNS);
    for (const f of STYLE_FILTERS.filter((x) => x.id !== 'all')) {
      const list = filterDesigns(f.id);
      expect(list.length, f.id).toBeGreaterThanOrEqual(2);
      expect(list.every((d) => d.tags.includes(f.id as never))).toBe(true);
    }
  });
});

describe('initials field', () => {
  it('asks for initials when empty and accepts one or two supported characters', () => {
    expect(initialsError('')).toMatch(/one or two/i);
    expect(initialsError('A')).toBeNull();
    expect(initialsError('AR')).toBeNull();
  });
});

describe('gallery navigation state', () => {
  it('keeps initials, filter and scroll position across a trip to the editor and back', () => {
    const ui = useUiStore.getState();
    ui.setInitials('AR');
    ui.explore();
    expect(useUiStore.getState().view).toBe('gallery');
    useUiStore.getState().setFilter('serif');
    useUiStore.getState().openEditor('interlace', 840);
    expect(useUiStore.getState().view).toBe('editor');
    useUiStore.getState().backToStyles();
    expect(useUiStore.getState()).toMatchObject({ view: 'gallery', initials: 'AR', filter: 'serif', galleryScroll: 840, lastDesign: 'interlace' });
  });
});
