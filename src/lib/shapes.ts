export const SHAPES = ['circle', 'square', 'squircle', 'hexagon'] as const;
export type Shape = (typeof SHAPES)[number];

export const SHAPE_LABELS: Record<Shape, string> = {
  circle: 'Circle',
  square: 'Square',
  squircle: 'Squircle',
  hexagon: 'Hexagon',
};

/** Superellipse exponent: |x|^n + |y|^n = r^n. */
export const SQUIRCLE_EXPONENT = 4.5;
const SQUIRCLE_SEGMENTS = 360;

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

export function circlePath(size: number): string {
  const r = fmt(size / 2);
  return `M0 ${r}A${r} ${r} 0 1 1 ${fmt(size)} ${r}A${r} ${r} 0 1 1 0 ${r}Z`;
}

export function squarePath(size: number): string {
  const s = fmt(size);
  return `M0 0H${s}V${s}H0Z`;
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

export function shapePath(shape: Shape, size: number): string {
  switch (shape) {
    case 'circle':
      return circlePath(size);
    case 'square':
      return squarePath(size);
    case 'squircle':
      return squirclePath(size);
    case 'hexagon':
      return hexagonPath(size);
  }
}

/**
 * Largest centered rectangle with the given width/height aspect that fits
 * inside the shape, shrunk by FIT_PADDING.
 */
export function safeBox(shape: Shape, size: number, aspect: number): { width: number; height: number } {
  const a = Math.max(aspect, 1e-6);
  let h: number;
  switch (shape) {
    case 'square':
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
  }
  h *= FIT_PADDING;
  return { width: h * a, height: h };
}

/** True when (x, y) lies inside the shape drawn on a size×size canvas. */
export function containsPoint(shape: Shape, size: number, x: number, y: number, eps = 1e-9): boolean {
  const r = size / 2;
  const u = Math.abs((x - r) / r);
  const v = Math.abs((y - r) / r);
  switch (shape) {
    case 'square':
      return u <= 1 + eps && v <= 1 + eps;
    case 'circle':
      return u * u + v * v <= 1 + eps;
    case 'squircle':
      return u ** SQUIRCLE_EXPONENT + v ** SQUIRCLE_EXPONENT <= 1 + eps;
    case 'hexagon':
      return v <= Math.sqrt(3) / 2 + eps && v <= Math.sqrt(3) * (1 - u) + eps;
  }
}
