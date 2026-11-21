import { mulberry32 } from './random';

export const SHAPES = ['circle', 'square', 'rounded', 'squircle', 'hexagon', 'pill', 'shield', 'blob', 'none'] as const;
export type Shape = (typeof SHAPES)[number];

export const SHAPE_LABELS: Record<Shape, string> = {
  circle: 'Circle',
  square: 'Square',
  rounded: 'Rounded',
  squircle: 'Squircle',
  hexagon: 'Hexagon',
  pill: 'Pill',
  shield: 'Shield',
  blob: 'Blob',
  none: 'None',
};

/** Shape parameters: `radius` for the rounded square (% of the side), `seed` for the blob. */
export interface ShapeOpts {
  radius?: number;
  seed?: number;
}

export const DEFAULT_RADIUS = 22;
export const DEFAULT_SEED = 7;
/** Pill height as a fraction of the canvas. */
export const PILL_HEIGHT = 0.6;

/** Superellipse exponent: |x|^n + |y|^n = r^n. */
export const SQUIRCLE_EXPONENT = 4.5;
const SQUIRCLE_SEGMENTS = 360;
const BLOB_SEGMENTS = 180;

/** Fraction of the largest inscribed box the glyphs may occupy. */
export const FIT_PADDING = 0.94;

export function isShape(value: unknown): value is Shape {
  return typeof value === 'string' && (SHAPES as readonly string[]).includes(value);
}

/** Round to 2 decimals for compact, stable path data. */
export function fmt(n: number): string {
  const r = Math.round(n * 100) / 100;
  return Object.is(r, -0) ? '0' : String(r);
}

type Pt = [number, number];

function polyPath(pts: readonly Pt[], size: number): string {
  return `${pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x * size)} ${fmt(y * size)}`).join('')}Z`;
}

/** Ray-casting point-in-polygon on unit coordinates. */
function inPolygon(pts: readonly Pt[], x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i]!;
    const [xj, yj] = pts[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function circlePath(size: number): string {
  const r = fmt(size / 2);
  return `M0 ${r}A${r} ${r} 0 1 1 ${fmt(size)} ${r}A${r} ${r} 0 1 1 0 ${r}Z`;
}

export function squarePath(size: number): string {
  const s = fmt(size);
  return `M0 0H${s}V${s}H0Z`;
}

export function roundedPath(size: number, radiusPct: number): string {
  const r = (size * Math.min(50, Math.max(0, radiusPct))) / 100;
  if (r === 0) return squarePath(size);
  const [R, s, e] = [fmt(r), fmt(size), fmt(size - r)];
  const arc = `A${R} ${R} 0 0 1`;
  return `M${R} 0H${e}${arc} ${s} ${R}V${e}${arc} ${e} ${s}H${R}${arc} 0 ${e}V${R}${arc} ${R} 0Z`;
}

export function pillPath(size: number): string {
  const h = size * PILL_HEIGHT;
  const r = fmt(h / 2);
  const y0 = (size - h) / 2;
  const xr = fmt(size - h / 2);
  return `M${r} ${fmt(y0)}H${xr}A${r} ${r} 0 0 1 ${xr} ${fmt(y0 + h)}H${r}A${r} ${r} 0 0 1 ${r} ${fmt(y0)}Z`;
}

/** Heater shield in unit coordinates: flat top, straight sides, curved to a bottom point. */
const SHIELD = { left: 0.1, right: 0.9, top: 0.04, shoulder: 0.45, ctrl: 0.8, tip: 0.97 } as const;

export function shieldPath(size: number): string {
  const f = (n: number) => fmt(n * size);
  const { left, right, top, shoulder, ctrl, tip } = SHIELD;
  return (
    `M${f(left)} ${f(top)}H${f(right)}V${f(shoulder)}` +
    `Q${f(right)} ${f(ctrl)} ${f(0.5)} ${f(tip)}Q${f(left)} ${f(ctrl)} ${f(left)} ${f(shoulder)}Z`
  );
}

function quad(p0: Pt, p1: Pt, p2: Pt, n: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 1) / n;
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
  });
}

// Chords of the convex curves lie inside the drawn shape, so containment is conservative.
const SHIELD_POLY: Pt[] = (() => {
  const { left, right, top, shoulder, ctrl, tip } = SHIELD;
  return [
    [left, top],
    [right, top],
    [right, shoulder],
    ...quad([right, shoulder], [right, ctrl], [0.5, tip], 32),
    ...quad([0.5, tip], [left, ctrl], [left, shoulder], 32),
  ];
})();

const blobCache = new Map<number, Pt[]>();

/** Seeded organic outline: a circle perturbed by three low-frequency harmonics (unit coordinates). */
export function blobPolygon(seed: number): Pt[] {
  const cached = blobCache.get(seed);
  if (cached) return cached;
  const rand = mulberry32(seed);
  const waves = [2, 3, 4].map((k) => ({ k, a: 0.03 + rand() * 0.06, phase: rand() * Math.PI * 2 }));
  const angle = (i: number) => (2 * Math.PI * i) / BLOB_SEGMENTS;
  const radii = Array.from({ length: BLOB_SEGMENTS }, (_, i) =>
    waves.reduce((sum, w) => sum + w.a * Math.cos(w.k * angle(i) + w.phase), 1),
  );
  const max = Math.max(...radii);
  const pts = radii.map((r, i): Pt => [0.5 + (0.5 * r * Math.cos(angle(i))) / max, 0.5 + (0.5 * r * Math.sin(angle(i))) / max]);
  blobCache.set(seed, pts);
  return pts;
}

/** Point on a superellipse of radius r at polar angle theta (centered at origin). */
export function squirclePoint(theta: number, r: number, n = SQUIRCLE_EXPONENT): [number, number] {
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  const rho = r / (Math.abs(c) ** n + Math.abs(s) ** n) ** (1 / n);
  return [rho * c, rho * s];
}

export function squirclePath(size: number, n = SQUIRCLE_EXPONENT, segments = SQUIRCLE_SEGMENTS): string {
  const r = size / 2;
  let d = '';
  for (let i = 0; i < segments; i++) {
    const [x, y] = squirclePoint((2 * Math.PI * i) / segments, r, n);
    d += `${i === 0 ? 'M' : 'L'}${fmt(r + x)} ${fmt(r + y)}`;
  }
  return `${d}Z`;
}

/** Vertices of a regular flat-top hexagon whose width equals `size`. */
export function hexagonVertices(size: number): [number, number][] {
  const r = size / 2;
  return Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k;
    return [r + r * Math.cos(a), r + r * Math.sin(a)] as [number, number];
  });
}

export function hexagonPath(size: number): string {
  return `${hexagonVertices(size)
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`)
    .join('')}Z`;
}

export function shapePath(shape: Shape, size: number, opts: ShapeOpts = {}): string {
  switch (shape) {
    case 'circle':
      return circlePath(size);
    case 'square':
      return squarePath(size);
    case 'rounded':
      return roundedPath(size, opts.radius ?? DEFAULT_RADIUS);
    case 'squircle':
      return squirclePath(size);
    case 'hexagon':
      return hexagonPath(size);
    case 'pill':
      return pillPath(size);
    case 'shield':
      return shieldPath(size);
    case 'blob':
      return polyPath(blobPolygon(opts.seed ?? DEFAULT_SEED), size);
    case 'none':
      return '';
  }
}

/** Largest centered box of aspect `a` (in canvas units of 1) whose edges stay inside the shape. */
function numericSafeHeight(shape: Shape, a: number, opts: ShapeOpts): number {
  const fits = (h: number) => {
    const hw = (h * a) / 2;
    const hh = h / 2;
    for (let i = 0; i <= 24; i++) {
      const t = -1 + i / 12;
      const pts: Pt[] = [
        [0.5 + t * hw, 0.5 - hh],
        [0.5 + t * hw, 0.5 + hh],
        [0.5 - hw, 0.5 + t * hh],
        [0.5 + hw, 0.5 + t * hh],
      ];
      if (pts.some(([x, y]) => !containsPoint(shape, 1, x, y, opts))) return false;
    }
    return true;
  };
  let lo = 0;
  let hi = Math.min(1, 1 / a);
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

/**
 * Largest centered rectangle with the given width/height aspect that fits
 * inside the shape, shrunk by FIT_PADDING.
 */
export function safeBox(shape: Shape, size: number, aspect: number, opts: ShapeOpts = {}): { width: number; height: number } {
  const a = Math.max(aspect, 1e-6);
  let h: number;
  switch (shape) {
    case 'square':
    case 'none':
      h = Math.min(size, size / a);
      break;
    case 'circle':
      h = size / Math.sqrt(1 + a * a);
      break;
    case 'squircle': {
      const n = SQUIRCLE_EXPONENT;
      h = size / (a ** n + 1) ** (1 / n);
      break;
    }
    case 'hexagon':
      h = Math.min((size * Math.sqrt(3)) / 2, size / (a + 1 / Math.sqrt(3)));
      break;
    default:
      h = size * numericSafeHeight(shape, a, opts);
  }
  h *= FIT_PADDING;
  return { width: h * a, height: h };
}

/** True when (x, y) lies inside the shape drawn on a size×size canvas. */
export function containsPoint(
  shape: Shape,
  size: number,
  x: number,
  y: number,
  opts: ShapeOpts = {},
  eps = 1e-9,
): boolean {
  const r = size / 2;
  const u = Math.abs((x - r) / r);
  const v = Math.abs((y - r) / r);
  switch (shape) {
    case 'square':
    case 'none':
      return u <= 1 + eps && v <= 1 + eps;
    case 'circle':
      return u * u + v * v <= 1 + eps;
    case 'squircle':
      return u ** SQUIRCLE_EXPONENT + v ** SQUIRCLE_EXPONENT <= 1 + eps;
    case 'hexagon':
      return v <= Math.sqrt(3) / 2 + eps && v <= Math.sqrt(3) * (1 - u) + eps;
    case 'rounded': {
      // Corner radius in half-side units.
      const c = Math.min(50, Math.max(0, opts.radius ?? DEFAULT_RADIUS)) / 50;
      if (u > 1 + eps || v > 1 + eps) return false;
      if (u <= 1 - c || v <= 1 - c) return true;
      return Math.hypot(u - (1 - c), v - (1 - c)) <= c + eps;
    }
    case 'pill': {
      const cr = PILL_HEIGHT; // cap radius in half-side units
      if (v > cr + eps) return false;
      return u <= 1 - cr || Math.hypot(u - (1 - cr), v) <= cr + eps;
    }
    case 'shield':
      return inPolygon(SHIELD_POLY, x / size, y / size);
    case 'blob':
      return inPolygon(blobPolygon(opts.seed ?? DEFAULT_SEED), x / size, y / size);
  }
}
