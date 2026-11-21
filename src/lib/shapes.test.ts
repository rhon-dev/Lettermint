import { describe, expect, it } from 'vitest';
import {
  SHAPES,
  SQUIRCLE_EXPONENT,
  containsPoint,
  hexagonVertices,
  isShape,
  safeBox,
  shapePath,
  squirclePath,
  squirclePoint,
} from './shapes';

function pathPoints(d: string): [number, number][] {
  const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) ?? [];
  const pts: [number, number][] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i]!, nums[i + 1]!]);
  return pts;
}

describe('shapes', () => {
  it('square has corner radius 0 and spans the canvas', () => {
    expect(shapePath('square', 512)).toBe('M0 0H512V512H0Z');
  });

  it('circle is two arcs with radius size/2', () => {
    expect(shapePath('circle', 100)).toBe('M0 50A50 50 0 1 1 100 50A50 50 0 1 1 0 50Z');
  });

  it('squircle is a true superellipse, not a rounded rect', () => {
    const size = 400;
    const r = size / 2;
    for (const [x, y] of pathPoints(squirclePath(size))) {
      const u = Math.abs((x - r) / r);
      const v = Math.abs((y - r) / r);
      expect(u ** SQUIRCLE_EXPONENT + v ** SQUIRCLE_EXPONENT).toBeCloseTo(1, 2);
    }
    // At 45° a superellipse with n=4.5 reaches r / 2^(1/n) ≈ 0.857r, unlike a circle (0.707r).
    const [x45] = squirclePoint(Math.PI / 4, 1);
    expect(x45).toBeCloseTo(2 ** (-1 / SQUIRCLE_EXPONENT), 6);
    expect(x45).toBeGreaterThan(Math.SQRT1_2);
  });

  it('hexagon is regular, flat-top and inscribed in the canvas width', () => {
    const size = 600;
    const v = hexagonVertices(size);
    expect(v).toHaveLength(6);
    const xs = v.map((p) => p[0]);
    expect(Math.min(...xs)).toBeCloseTo(0, 6);
    expect(Math.max(...xs)).toBeCloseTo(size, 6);
    // Flat top: two vertices share the minimum y.
    const minY = Math.min(...v.map((p) => p[1]));
    expect(v.filter((p) => Math.abs(p[1] - minY) < 1e-9)).toHaveLength(2);
    // Regular: all sides equal.
    const sides = v.map((p, i) => {
      const q = v[(i + 1) % 6]!;
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    for (const s of sides) expect(s).toBeCloseTo(size / 2, 6);
  });

  it('safeBox corners lie inside every shape for many aspect ratios', () => {
    const size = 1000;
    for (const shape of SHAPES) {
      for (const aspect of [0.2, 0.5, 0.8, 1, 1.3, 2, 3.5]) {
        const { width, height } = safeBox(shape, size, aspect);
        expect(width / height).toBeCloseTo(aspect, 9);
        const c = size / 2;
        for (const [dx, dy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ] as const) {
          expect(containsPoint(shape, size, c + (dx * width) / 2, c + (dy * height) / 2)).toBe(true);
        }
      }
    }
  });

  it('containsPoint rejects points outside', () => {
    expect(containsPoint('circle', 100, 2, 2)).toBe(false);
    expect(containsPoint('squircle', 100, 0.5, 0.5)).toBe(false);
    expect(containsPoint('hexagon', 100, 50, 2)).toBe(false);
    expect(containsPoint('square', 100, 101, 50)).toBe(false);
  });

  it('isShape validates input', () => {
    expect(isShape('hexagon')).toBe(true);
    expect(isShape('triangle')).toBe(false);
    expect(isShape(3)).toBe(false);
  });
});
