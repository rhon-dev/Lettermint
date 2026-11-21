import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToRgb, meetsAA, parseHex, relativeLuminance } from './color';

describe('parseHex', () => {
  it('accepts #RGB and #RRGGBB and normalizes to lowercase #rrggbb', () => {
    expect(parseHex('#FFF')).toBe('#ffffff');
    expect(parseHex('#1a2B3c')).toBe('#1a2b3c');
    expect(parseHex('abc')).toBe('#aabbcc');
    expect(parseHex('  #111111 ')).toBe('#111111');
  });

  it('rejects anything else', () => {
    for (const bad of ['', '#', '#12', '#1234', '#12345', '#1234567', '#ggg', 'red', '##fff']) {
      expect(parseHex(bad)).toBeNull();
    }
  });
});

describe('contrast', () => {
  it('converts hex to rgb', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(() => hexToRgb('nope')).toThrow();
  });

  it('computes WCAG luminance and ratios', () => {
    expect(relativeLuminance('#000')).toBe(0);
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 10);
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 10);
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 10);
    expect(contrastRatio('#777', '#777')).toBeCloseTo(1, 10);
    // Known reference: #767676 on white is 4.54:1.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
    // Defaults: #FFFFFF on #111111.
    expect(contrastRatio('#111111', '#ffffff')).toBeCloseTo(18.88, 1);
  });

  it('applies the AA 4.5 threshold', () => {
    expect(meetsAA(4.5)).toBe(true);
    expect(meetsAA(4.49)).toBe(false);
  });
});
