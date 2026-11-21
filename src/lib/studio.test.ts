import { describe, expect, it } from 'vitest';
import { contrastRatio, meetsAA } from './color';
import { History } from './history';
import { PALETTES } from './palettes';
import { decodeState, encodeState } from './share';
import { gradientVector, logoSvgString } from './svg';
import { mulberry32, variationSet } from './variations';
import { DEFAULTS, validatePartial } from '../store/logo';

describe('palettes', () => {
  it('every preset passes WCAG AA on both gradient stops', () => {
    for (const p of PALETTES) {
      expect(meetsAA(contrastRatio(p.bg, p.fg)), `${p.name} bg`).toBe(true);
      expect(meetsAA(contrastRatio(p.bg2, p.fg)), `${p.name} bg2`).toBe(true);
    }
  });
});

describe('share encoding', () => {
  it('round-trips the full state through the validator', () => {
    const state = { ...DEFAULTS, text: 'Ab', uppercase: false, fill: 'gradient' as const, gradientAngle: 90 };
    expect(validatePartial(decodeState(`#${encodeState(state)}`))).toEqual(state);
  });

  it('drops hostile or invalid values', () => {
    const v = validatePartial(decodeState('t=<script>&sh=triangle&bg=zzz&s=999999&f=comic&fl=pattern'));
    expect(v).toEqual({ text: 'sc', size: 1024 });
  });

  it('ignores missing numeric keys instead of zeroing them', () => {
    expect(validatePartial(decodeState('t=Q'))).toEqual({ text: 'Q' });
  });
});

describe('variations', () => {
  it('is deterministic for a seed and unique within a set', () => {
    const a = variationSet(42, 8);
    expect(variationSet(42, 8)).toEqual(a);
    expect(a).toHaveLength(8);
    expect(new Set(a.map((v) => `${v.fontId}|${v.shape}|${v.bgColor}`)).size).toBe(8);
  });

  it('only produces values the store accepts', () => {
    for (const v of variationSet(7, 8)) expect(validatePartial(v)).toEqual(v);
  });

  it('mulberry32 stays in [0, 1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe('gradientVector', () => {
  it('follows CSS angle conventions', () => {
    const toRight = gradientVector(90, 100);
    expect(toRight.x1).toBeCloseTo(0);
    expect(toRight.x2).toBeCloseTo(100);
    expect(toRight.y1).toBeCloseTo(50);
    const toTop = gradientVector(0, 100);
    expect(toTop.y1).toBeCloseTo(100);
    expect(toTop.y2).toBeCloseTo(0);
    // 45° reaches the corners.
    const diag = gradientVector(45, 100);
    expect(diag.x2).toBeCloseTo(100);
    expect(diag.y2).toBeCloseTo(0);
  });
});

describe('logoSvgString', () => {
  const geo = {
    viewBox: '0 0 10 10',
    shapePath: 'M0 0H10V10H0Z',
    glyphPath: 'M1 1L2 2Z',
    glyphCommands: [],
    glyphBox: null,
    placeholder: false,
    strokeWidth: 0,
    ringPath: '',
    ringOffset: 0,
    ringWidth: 0,
  };
  const paint = { ...DEFAULTS, size: 10 };

  it('emits a solid standalone SVG with an escaped title', () => {
    const svg = logoSvgString(paint, geo, 'A & "B" <c>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('<title>A &amp; &quot;B&quot; &lt;c></title>');
    expect(svg).toContain('fill="#111111"');
    expect(svg).not.toContain('linearGradient');
  });

  it('emits a gradient when requested and omits placeholder glyphs', () => {
    const svg = logoSvgString({ ...paint, fill: 'gradient' }, { ...geo, placeholder: true }, 't');
    expect(svg).toContain('<linearGradient id="lm-bg"');
    expect(svg).toContain('fill="url(#lm-bg)"');
    expect(svg).not.toContain('M1 1L2 2Z');
  });
});

describe('History', () => {
  const eq = (a: number, b: number) => a === b;

  it('undoes and redoes discrete steps', () => {
    const h = new History<number>(0, eq, 500);
    h.record(1, 0);
    h.record(2, 1000);
    expect(h.undo()).toBe(1);
    expect(h.undo()).toBe(0);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBe(1);
    expect(h.canRedo).toBe(true);
  });

  it('merges rapid changes (slider drag) into one step', () => {
    const h = new History<number>(0, eq, 500);
    for (let i = 1; i <= 20; i++) h.record(i, i * 16);
    expect(h.undo()).toBe(0);
    expect(h.canUndo).toBe(false);
  });

  it('clears redo after a new change and ignores no-ops', () => {
    const h = new History<number>(0, eq, 0);
    h.record(1, 10);
    h.undo();
    expect(h.record(0, 20)).toBe(false);
    h.record(5, 30);
    expect(h.canRedo).toBe(false);
  });
});
