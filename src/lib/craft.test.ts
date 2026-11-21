import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { availableWeights, fontUrl, nearestWeight } from '../fonts/registry';
import { DEFAULTS, validatePartial } from '../store/logo';
import { RING_INNER, buildLogo, commandsBox } from './buildLogo';
import { SHAPES, containsPoint, isShape, safeBox, shapePath } from './shapes';
import { gradientVector, logoSvgString } from './svg';

const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTestFont(pkg: string, weight: number): Font {
  const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}
const inter = loadTestFont('inter', 700);
const base = { text: 'LM', uppercase: true, shape: 'circle', size: 512, scale: 55, spacing: 0 } as const;

describe('Phase 3 shapes', () => {
  it('offers rounded, pill, shield, blob and no shape', () => {
    for (const s of ['rounded', 'pill', 'shield', 'blob', 'none']) expect(isShape(s)).toBe(true);
  });

  it('rounded square uses the radius as % of the side', () => {
    expect(shapePath('rounded', 100, { radius: 20 })).toBe(
      'M20 0H80A20 20 0 0 1 100 20V80A20 20 0 0 1 80 100H20A20 20 0 0 1 0 80V20A20 20 0 0 1 20 0Z',
    );
    // The corner is cut: (1,1) is outside with radius 20, inside with radius 0.
    expect(containsPoint('rounded', 100, 1, 1, { radius: 20 })).toBe(false);
    expect(containsPoint('rounded', 100, 1, 1, { radius: 0 })).toBe(true);
  });

  it('pill is a horizontal stadium centered on the canvas', () => {
    expect(containsPoint('pill', 100, 50, 10)).toBe(false);
    expect(containsPoint('pill', 100, 50, 50)).toBe(true);
    expect(containsPoint('pill', 100, 2, 50)).toBe(true);
    expect(containsPoint('pill', 100, 2, 30)).toBe(false);
  });

  it('shield narrows to a point at the bottom', () => {
    expect(containsPoint('shield', 100, 50, 95)).toBe(true);
    expect(containsPoint('shield', 100, 15, 95)).toBe(false);
    expect(containsPoint('shield', 100, 15, 20)).toBe(true);
  });

  it('blob is deterministic per seed and differs between seeds', () => {
    expect(shapePath('blob', 200, { seed: 3 })).toBe(shapePath('blob', 200, { seed: 3 }));
    expect(shapePath('blob', 200, { seed: 3 })).not.toBe(shapePath('blob', 200, { seed: 4 }));
  });

  it('"none" draws nothing and lets letters use the canvas', () => {
    expect(shapePath('none', 100)).toBe('');
    expect(safeBox('none', 100, 1).width).toBeGreaterThan(safeBox('circle', 100, 1).width);
  });

  it('safeBox corners stay inside rounded and blob for any radius/seed', () => {
    for (const opts of [{ radius: 2 }, { radius: 50 }, { seed: 1 }, { seed: 99 }]) {
      for (const shape of ['rounded', 'blob'] as const) {
        for (const aspect of [0.3, 1, 2.5]) {
          const { width, height } = safeBox(shape, 1000, aspect, opts);
          for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const) {
            expect(containsPoint(shape, 1000, 500 + (dx * width) / 2, 500 + (dy * height) / 2, opts)).toBe(true);
          }
        }
      }
    }
  });
});

function corners(b: { x1: number; y1: number; x2: number; y2: number }): [number, number][] {
  return [[b.x1, b.y1], [b.x2, b.y1], [b.x2, b.y2], [b.x1, b.y2]];
}

describe('Phase 3 letter craft', () => {
  it('outline letters keep the whole stroke inside the shape', () => {
    for (const shape of SHAPES) {
      const geo = buildLogo({ ...base, shape, scale: 90, letterStyle: 'outline', stroke: 60 }, inter);
      const sw = geo.strokeWidth;
      expect(sw).toBeCloseTo((512 * 60) / 1000, 6);
      const b = geo.glyphBox!;
      const grown = { x1: b.x1 - sw / 2, y1: b.y1 - sw / 2, x2: b.x2 + sw / 2, y2: b.y2 + sw / 2 };
      for (const [x, y] of corners(grown)) expect(containsPoint(shape, 512, x, y), shape).toBe(true);
    }
  });

  it('fill letters have no stroke', () => {
    expect(buildLogo(base, inter).strokeWidth).toBe(0);
  });

  it('inner ring is the shape scaled around the center and letters stay inside it', () => {
    const geo = buildLogo({ ...base, shape: 'squircle', scale: 90, ring: true }, inter);
    expect(geo.ringPath).toBe(shapePath('squircle', 512 * RING_INNER.scale));
    expect(geo.ringOffset).toBeCloseTo((512 - 512 * RING_INNER.scale) / 2, 6);
    const inner = 512 * (RING_INNER.scale - RING_INNER.width * 2);
    const off = (512 - inner) / 2;
    for (const [x, y] of corners(geo.glyphBox!)) expect(containsPoint('squircle', inner, x - off, y - off)).toBe(true);
    expect(buildLogo({ ...base, shape: 'none', ring: true }, inter).ringPath).toBe('');
  });

  it('rotation and vertical shift move one letter and keep the pair centered and inside', () => {
    const plain = buildLogo(base, inter);
    const moved = buildLogo({ ...base, rotate2: 30, shift: 20, scale: 90, shape: 'hexagon' }, inter);
    expect(moved.glyphPath).not.toBe(plain.glyphPath);
    const b = commandsBox(moved.glyphCommands)!;
    expect((b.x1 + b.x2) / 2).toBeCloseTo(256, 6);
    expect((b.y1 + b.y2) / 2).toBeCloseTo(256, 6);
    for (const [x, y] of corners(b)) expect(containsPoint('hexagon', 512, x, y)).toBe(true);
  });

  it('per-letter transforms are ignored for a single character', () => {
    const one = buildLogo({ ...base, text: 'L' }, inter);
    expect(buildLogo({ ...base, text: 'L', rotate2: 40, shift: 30 }, inter).glyphPath).toBe(one.glyphPath);
  });
});

describe('Phase 3 export paint', () => {
  const geo = buildLogo({ ...base, ring: true, letterStyle: 'outline', stroke: 40 }, inter);

  it('exports outline strokes, the ring and a letter gradient', () => {
    const svg = logoSvgString(
      { ...DEFAULTS, ring: true, letterStyle: 'outline', fgFill: 'gradient', fgColor2: '#ff0000' },
      geo,
      't',
    );
    expect(svg).toContain('<linearGradient id="lm-fg"');
    expect(svg).toContain('stroke="url(#lm-fg)"');
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linejoin="round"');
    expect(svg).toContain(`transform="translate(${Math.round(geo.ringOffset * 100) / 100} ${Math.round(geo.ringOffset * 100) / 100})"`);
  });

  it('omits the background path when the shape is none', () => {
    const none = buildLogo({ ...base, shape: 'none' }, inter);
    const svg = logoSvgString({ ...DEFAULTS, shape: 'none' }, none, 't');
    expect(svg.match(/<path/g)).toHaveLength(1);
  });

  it('gradientVector spans a rectangle when given width and height', () => {
    const v = gradientVector(90, 100, 50, 10, 20);
    expect(v.x1).toBeCloseTo(10);
    expect(v.x2).toBeCloseTo(110);
    expect(v.y1).toBeCloseTo(45);
  });
});

describe('Phase 3 weights', () => {
  it('lists the static weights shipped for each font', () => {
    expect(availableWeights('inter')).toEqual([400, 500, 600, 700, 800]);
    expect(availableWeights('space-grotesk')).toEqual([400, 500, 600, 700]);
  });

  it('falls back to the nearest available weight', () => {
    expect(nearestWeight('space-grotesk', 800)).toBe(700);
    expect(nearestWeight('syne', 400)).toBe(400);
    expect(fontUrl('space-grotesk', 800)).toMatch(/space-grotesk-latin-700-normal\.woff/);
  });
});

describe('Phase 3 store validation', () => {
  it('accepts valid craft fields', () => {
    const craft = {
      shape: 'blob', radius: 30, blobSeed: 12, ring: true, letterStyle: 'outline', stroke: 35,
      fgFill: 'gradient', fgColor2: '#abcdef', weight: 500, shift: -15, rotate1: 10, rotate2: -20, spacing: -40,
    };
    expect(validatePartial(craft)).toEqual(craft);
  });

  it('drops or clamps invalid craft fields', () => {
    expect(
      validatePartial({ letterStyle: 'neon', weight: 450, fgFill: 'pattern', ring: 'yes', stroke: 999, rotate1: -500 }),
    ).toEqual({ stroke: 80, rotate1: -45 });
  });
});
