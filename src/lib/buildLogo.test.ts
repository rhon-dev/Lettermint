import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { FONTS } from '../fonts/registry';
import { SHAPES, containsPoint, safeBox } from './shapes';
import { buildGlyphs, buildLogo, commandsBox, fitGlyphBox } from './buildLogo';

describe('fitGlyphBox (centering math)', () => {
  it('centers the bounding box, not the font metrics', () => {
    // An off-center box, e.g. a descender glyph sitting below the baseline.
    const box = { x1: 10, y1: -200, x2: 410, y2: 300 };
    const { k, tx, ty } = fitGlyphBox(box, 'square', 500, 50);
    expect(k).toBeCloseTo(0.5, 10); // height 500 → 250 = 50% of 500
    expect(((box.x1 + box.x2) / 2) * k + tx).toBeCloseTo(250, 10);
    expect(((box.y1 + box.y2) / 2) * k + ty).toBeCloseTo(250, 10);
  });

  it('caps the scale so a wide box fits inside the shape', () => {
    const box = { x1: 0, y1: 0, x2: 300, y2: 100 }; // aspect 3
    const { k } = fitGlyphBox(box, 'circle', 1000, 90);
    const safe = safeBox('circle', 1000, 3);
    expect(k * 100).toBeCloseTo(safe.height, 10);
    expect(k * 100).toBeLessThan(900);
  });

  it('uses the requested scale when it fits', () => {
    const box = { x1: 0, y1: 0, x2: 50, y2: 100 };
    const { k } = fitGlyphBox(box, 'square', 1000, 40);
    expect(k * 100).toBeCloseTo(400, 10);
  });
});

describe('commandsBox', () => {
  it('uses curve extrema, not control points', () => {
    // Quadratic from (0,0) to (100,0) with control (50,100): peak y = 50, not 100.
    const box = commandsBox([
      { type: 'M', x: 0, y: 0 },
      { type: 'Q', x1: 50, y1: 100, x: 100, y: 0 },
      { type: 'Z' },
    ]);
    expect(box).toEqual({ x1: 0, y1: 0, x2: 100, y2: 50 });
    // Cubic with symmetric controls at y=100 peaks at 75.
    const c = commandsBox([
      { type: 'M', x: 0, y: 0 },
      { type: 'C', x1: 0, y1: 100, x2: 100, y2: 100, x: 100, y: 0 },
    ]);
    expect(c?.y2).toBeCloseTo(75, 10);
  });

  it('returns null for empty outlines', () => {
    expect(commandsBox([])).toBeNull();
  });
});

const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTestFont(pkg: string, weight: number): Font {
  const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

describe('all fonts × all shapes', () => {
  const texts = ['A', 'g', '&', 'LM', 'WM', 'Wg', '&&', 'Qj', 'mm', '00'];
  for (const def of FONTS) {
    const font = loadTestFont(def.pkg, def.weight);
    it(`${def.family}: centered and never clipped at max scale`, () => {
      for (const shape of SHAPES) {
        for (const size of [64, 512, 1024]) {
          for (const text of texts) {
            for (const spacing of [0, 30, -10]) {
              const g = buildGlyphs(font, text, { shape, size, scale: 90, spacingEm: spacing / 100 });
              expect(g.box, `${def.id} ${shape} ${text}`).not.toBeNull();
              // Independently recompute the bbox from the transformed outline.
              const box = commandsBox(g.commands)!;
              const cx = (box.x1 + box.x2) / 2;
              const cy = (box.y1 + box.y2) / 2;
              expect(Math.abs(cx - size / 2), `${def.id} ${shape} ${text} cx`).toBeLessThan(1e-6);
              expect(Math.abs(cy - size / 2), `${def.id} ${shape} ${text} cy`).toBeLessThan(1e-6);
              for (const [x, y] of [
                [box.x1, box.y1],
                [box.x2, box.y1],
                [box.x2, box.y2],
                [box.x1, box.y2],
              ] as const) {
                expect(containsPoint(shape, size, x, y), `${def.id} ${shape} ${text} clipped`).toBe(true);
              }
            }
          }
        }
      }
    });

    it(`${def.family}: "&" renders a real glyph`, () => {
      const g = buildGlyphs(font, '&', { shape: 'circle', size: 512, scale: 55, spacingEm: 0 });
      expect(g.d.length).toBeGreaterThan(50);
      expect(font.charToGlyph('&').name).toBe('ampersand');
    });
  }
});

describe('buildLogo', () => {
  const font = loadTestFont('inter', 700);
  const base = { text: 'LM', uppercase: true, shape: 'circle', size: 512, scale: 55, spacing: 0 } as const;

  it('returns a viewBox equal to the canvas size', () => {
    const logo = buildLogo({ ...base, size: 256 }, font);
    expect(logo.viewBox).toBe('0 0 256 256');
    expect(logo.placeholder).toBe(false);
    expect(logo.glyphPath).toMatch(/^M/);
  });

  it('honors the requested height when there is room', () => {
    const logo = buildLogo({ ...base, text: 'I', shape: 'square', scale: 40 }, font);
    const h = logo.glyphBox!.y2 - logo.glyphBox!.y1;
    expect(h).toBeCloseTo(512 * 0.4, 6);
  });

  it('shows a placeholder for empty input without breaking', () => {
    const logo = buildLogo({ ...base, text: '' }, font);
    expect(logo.placeholder).toBe(true);
    expect(logo.glyphPath.length).toBeGreaterThan(0);
    expect(logo.shapePath.length).toBeGreaterThan(0);
  });

  it('renders the shape only while no font is loaded', () => {
    const logo = buildLogo(base, null);
    expect(logo.glyphPath).toBe('');
    expect(logo.shapePath).toMatch(/^M/);
  });

  it('applies the uppercase toggle', () => {
    const lower = buildLogo({ ...base, text: 'lm', uppercase: false }, font);
    const upper = buildLogo({ ...base, text: 'lm', uppercase: true }, font);
    expect(lower.glyphPath).not.toBe(upper.glyphPath);
    expect(upper.glyphPath).toBe(buildLogo({ ...base, text: 'LM' }, font).glyphPath);
  });

  it('letter spacing widens two-character input only', () => {
    const tight = buildLogo({ ...base, shape: 'square', scale: 30 }, font);
    const wide = buildLogo({ ...base, shape: 'square', scale: 30, spacing: 30 }, font);
    expect(wide.glyphBox!.x2 - wide.glyphBox!.x1).toBeGreaterThan(tight.glyphBox!.x2 - tight.glyphBox!.x1);
    const one = buildLogo({ ...base, text: 'L', spacing: 0 }, font);
    const oneSpaced = buildLogo({ ...base, text: 'L', spacing: 30 }, font);
    expect(oneSpaced.glyphPath).toBe(one.glyphPath);
  });
});
