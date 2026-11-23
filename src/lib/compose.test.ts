import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { DEFAULTS, validatePartial, type LogoState } from '../store/logo';
import { buildLogo, commandsBox } from './buildLogo';
import {
  COMPOSITION_KEYS,
  OFFSET_UNIT,
  clientToLogo,
  composeStarter,
  letterLabels,
  nudgeOffsets,
  offsetDelta,
  snapCenter,
} from './compose';
import { History } from './history';
import { decodeState, encodeState, readShareHash, SHARE_VERSION, withV1Composition } from './share';
import { logoSvgString } from './svg';

const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTestFont(pkg: string, weight: number): Font {
  const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}
const inter = loadTestFont('inter', 700);
const fraunces = loadTestFont('fraunces', 600);
const plain: LogoState = { ...DEFAULTS, text: 'AR', shape: 'square', spacing: 0, shift: 0, rotate1: 0, rotate2: 0, knockout: 0 };

describe('clientToLogo (screen → logo coordinates)', () => {
  it('maps the corners of a square stage to the canvas corners', () => {
    const rect = { left: 100, top: 50, width: 400, height: 400 };
    expect(clientToLogo(100, 50, rect, 512)).toEqual({ x: 0, y: 0 });
    expect(clientToLogo(500, 450, rect, 512)).toEqual({ x: 512, y: 512 });
  });

  it('accounts for the letterbox of a wide stage (SVG meet scaling)', () => {
    // 800×400 stage: the 512 canvas is drawn 400 px wide, centered, so it starts at x = 200.
    const rect = { left: 0, top: 0, width: 800, height: 400 };
    expect(clientToLogo(200, 0, rect, 512)).toEqual({ x: 0, y: 0 });
    expect(clientToLogo(400, 200, rect, 512)).toEqual({ x: 256, y: 256 });
  });

  it('gives the same logo point for the same relative position at any screen size', () => {
    const small = clientToLogo(75, 25, { left: 0, top: 0, width: 100, height: 100 }, 512);
    const large = clientToLogo(750, 250, { left: 0, top: 0, width: 1000, height: 1000 }, 512);
    expect(small).toEqual(large);
  });
});

describe('letter offsets', () => {
  it('offsetDelta converts logo units to canvas-relative offset units', () => {
    expect(offsetDelta(51.2, 512)).toBeCloseTo(OFFSET_UNIT / 10, 10);
  });

  it('moves only the chosen letter, by the exact logo distance', () => {
    const before = buildLogo(plain, inter);
    const after = buildLogo({ ...plain, dx2: 1000, dy2: -500 }, inter);
    expect(after.letters[0]!.d).toBe(before.letters[0]!.d);
    const a = before.letters[1]!.box!;
    const b = after.letters[1]!.box!;
    expect(b.x1 - a.x1).toBeCloseTo(51.2, 6);
    expect(b.y1 - a.y1).toBeCloseTo(-25.6, 6);
  });

  it('keeps the same relative composition at any canvas size', () => {
    const at = (size: number) => buildLogo({ ...plain, size, dx2: 800 }, inter).letters[1]!.box!.x1 / size;
    expect(at(256)).toBeCloseTo(at(1024), 6);
  });

  it('the exported SVG uses exactly the previewed glyph path', () => {
    const state = { ...plain, dx1: -300, dy2: 450, layout: 'stack' as const };
    const geo = buildLogo(state, inter);
    expect(geo.glyphPath).toBe(geo.letters.map((l) => l.d).join(''));
    expect(logoSvgString(state, geo, 't')).toContain(`d="${geo.glyphPath}"`);
  });

  it('nudges with arrow steps and larger Shift steps, clamped to the limit', () => {
    expect(nudgeOffsets(plain, 1, 'right', false)).toEqual({ dx2: 50 });
    expect(nudgeOffsets(plain, 0, 'up', true)).toEqual({ dy1: -500 });
    expect(nudgeOffsets({ ...plain, dx1: 4900 }, 0, 'right', true)).toEqual({ dx1: 5000 });
  });
});

describe('overlap knockout', () => {
  const overlap = { ...plain, ...composeStarter('overlap', inter, 'AR') };

  it('only the overlap starter cuts a gap', () => {
    expect(overlap.knockout).toBeGreaterThan(0);
    expect(composeStarter('side', inter, 'AR').knockout).toBe(0);
    expect(composeStarter('stack', inter, 'AR').knockout).toBe(0);
  });

  it('masks the first letter with the second letter widened by the gap, in preview and export alike', () => {
    const geo = buildLogo(overlap, inter);
    const gap = (overlap.knockout * overlap.size) / 1000;
    expect(geo.knockoutWidth).toBeCloseTo(gap, 10);
    const svg = logoSvgString(overlap, geo, 't');
    expect(svg).toContain(`<mask id="lm-ko"`);
    expect(svg).toContain(`stroke-width="${+(gap * 2).toFixed(2)}"`);
    expect(svg).toContain(`<path d="${geo.letters[0]!.d}" fill="${overlap.fgColor}" mask="url(#lm-ko)"/>`);
    expect(svg).toContain(`<path d="${geo.letters[1]!.d}" fill="${overlap.fgColor}"/>`);
  });

  it('leaves marks without a knockout exactly as before (one glyph path)', () => {
    const geo = buildLogo(plain, inter);
    expect(logoSvgString(plain, geo, 't')).toContain(`<path d="${geo.glyphPath}" fill="${plain.fgColor}"/>`);
    expect(logoSvgString(plain, geo, 't')).not.toContain('mask');
  });
});

describe('snapCenter', () => {
  it('snaps to a nearby target and reports the guide', () => {
    expect(snapCenter({ x: 253, y: 100 }, { x: [256], y: [256] }, 6)).toEqual({ dx: 3, dy: 0, guideX: 256, guideY: null });
  });

  it('does nothing outside the threshold', () => {
    expect(snapCenter({ x: 240, y: 240 }, { x: [256], y: [256] }, 6)).toEqual({ dx: 0, dy: 0, guideX: null, guideY: null });
  });
});

describe('letterLabels', () => {
  it('gives identical letters distinct names', () => {
    expect(letterLabels('AA')).toEqual(['First A', 'Second A']);
    expect(letterLabels('AR')).toEqual(['First A', 'Second R']);
    expect(letterLabels('Q')).toEqual(['Letter Q']);
    expect(letterLabels('')).toEqual([]);
  });
});

describe('composition starters', () => {
  const ink = (s: LogoState, font: Font) => buildLogo(s, font).letters.map((l) => l.box);

  for (const text of ['II', 'MW', 'AR']) {
    for (const [name, font] of [['Inter', inter], ['Fraunces', fraunces]] as const) {
      it(`${name} ${text}: side by side leaves a measured gap between the ink`, () => {
        const s = { ...plain, text, ...composeStarter('side', font, text) };
        const [a, b] = ink(s, font);
        expect(b!.x1).toBeGreaterThan(a!.x2);
      });

      it(`${name} ${text}: overlap makes the ink boxes intersect`, () => {
        const s = { ...plain, text, ...composeStarter('overlap', font, text) };
        const [a, b] = ink(s, font);
        expect(b!.x1).toBeLessThan(a!.x2);
        expect(b!.x2).toBeGreaterThan(a!.x2);
      });

      it(`${name} ${text}: stack puts the second letter below the first, centered`, () => {
        const s = { ...plain, text, ...composeStarter('stack', font, text) };
        const [a, b] = ink(s, font);
        expect(b!.y1).toBeGreaterThan(a!.y2);
        expect((a!.x1 + a!.x2) / 2).toBeCloseTo((b!.x1 + b!.x2) / 2, 6);
      });
    }
  }

  it('changes only composition properties', () => {
    for (const kind of ['side', 'overlap', 'stack'] as const) {
      const keys = Object.keys(composeStarter(kind, inter, 'AR'));
      for (const k of keys) expect(COMPOSITION_KEYS).toContain(k);
      // Starters reset positions so the starter is a clean base.
      expect(composeStarter(kind, inter, 'AR')).toMatchObject({ dx1: 0, dy1: 0, dx2: 0, dy2: 0 });
    }
  });

  it('keeps every starter inside the shape for narrow and wide pairs', () => {
    for (const text of ['II', 'MW', 'AR', 'Wg']) {
      for (const kind of ['side', 'overlap', 'stack'] as const) {
        const s = { ...plain, shape: 'circle' as const, text, ...composeStarter(kind, inter, text) };
        const box = commandsBox(buildLogo(s, inter).glyphCommands)!;
        expect(box.x1).toBeGreaterThanOrEqual(0);
        expect(box.x2).toBeLessThanOrEqual(s.size);
      }
    }
  });
});

describe('default mark', () => {
  it('is exactly the Overlap starter for Fraunces 800 "LM", so the Overlap chip shows as active', () => {
    const f800 = loadTestFont('fraunces', 800);
    expect(DEFAULTS).toMatchObject({ text: 'LM', fontId: 'fraunces', weight: 800, ...composeStarter('overlap', f800, 'LM') });
  });
});

describe('History gestures', () => {
  const eq = (a: number, b: number) => a === b;

  it('records a whole drag as one undo step, however slow', () => {
    const h = new History<number>(0, eq, 500);
    h.beginGesture();
    for (let i = 1; i <= 5; i++) h.record(i, i * 2000);
    h.endGesture();
    expect(h.undo()).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it('keeps a change made just before the drag as its own step', () => {
    const h = new History<number>(0, eq, 500);
    h.record(1, 0);
    h.beginGesture();
    h.record(2, 10);
    h.endGesture();
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
  });

  it('leaves no empty step when a cancelled drag returns to the start', () => {
    const h = new History<number>(0, eq, 500);
    h.beginGesture();
    h.record(3, 10);
    h.record(0, 20);
    h.endGesture();
    expect(h.canUndo).toBe(false);
  });

  it('does not merge the next action into a finished drag', () => {
    const h = new History<number>(0, eq, 500);
    h.beginGesture();
    h.record(1, 0);
    h.endGesture();
    h.record(2, 10);
    expect(h.undo()).toBe(1);
  });
});

describe('share links with composition', () => {
  it('writes a version and round-trips layout and offsets', () => {
    const state: LogoState = { ...DEFAULTS, layout: 'stack', dx1: -120, dy1: 40, dx2: 333, dy2: -4500, knockout: 24 };
    const hash = encodeState(state);
    expect(new URLSearchParams(hash).get('v')).toBe(String(SHARE_VERSION));
    expect(validatePartial(decodeState(`#${hash}`))).toEqual(state);
  });

  it('gives an old link neutral composition defaults, not the autosaved ones', () => {
    const old =
      '#t=AR&u=1&sh=circle&r=22&bs=7&rg=0&f=inter&w=700&bg=111111&bg2=047857&fl=solid&ga=135&fg=ffffff&fg2=a7f3d0&ff=solid&ls=fill&st=30&s=512&k=55&sp=-6&sy=12&r1=0&r2=8&n=';
    const { state, damaged } = readShareHash(old);
    expect(damaged).toBe(false);
    expect(state).toMatchObject({ text: 'AR', spacing: -6, shift: 12, rotate2: 8, layout: 'row', dx1: 0, dy1: 0, dx2: 0, dy2: 0, knockout: 0 });
  });

  it('gives an autosave from before letter positions the composition it was drawn with', () => {
    const saved = validatePartial({ ...DEFAULTS, layout: undefined, knockout: undefined, dx1: undefined, text: 'AR', spacing: -20 });
    expect(withV1Composition(saved)).toMatchObject({ text: 'AR', spacing: -20, layout: 'row', knockout: 0, dx1: 0 });
  });

  it('drops hostile composition values', () => {
    expect(validatePartial(decodeState('ly=diagonal&x1=1e9&y1=abc&x2=-Infinity'))).toEqual({ dx1: 5000 });
  });
});
