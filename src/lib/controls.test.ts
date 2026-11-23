import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, useLogoStore } from '../store/logo';
import { contrastRatio } from './color';
import { craftControls, nextBlobSeed, worstContrast } from './controls';
import { describeLogo } from './describe';

describe('craftControls', () => {
  it('enables monogram rotation and shift only for two characters', () => {
    expect(craftControls({ ...DEFAULTS, text: 'LM' }).pair).toBe(true);
    expect(craftControls({ ...DEFAULTS, text: 'L' }).pair).toBe(false);
    expect(craftControls({ ...DEFAULTS, text: '' }).pair).toBe(false);
  });

  it('shows the corner radius only for the rounded square', () => {
    expect(craftControls({ ...DEFAULTS, shape: 'rounded' }).showRadius).toBe(true);
    expect(craftControls({ ...DEFAULTS, shape: 'square' }).showRadius).toBe(false);
  });

  it('shows the blob reroll only for the blob', () => {
    expect(craftControls({ ...DEFAULTS, shape: 'blob' }).showSeed).toBe(true);
    expect(craftControls({ ...DEFAULTS, shape: 'circle' }).showSeed).toBe(false);
  });

  it('disables the inner ring when there is no shape', () => {
    expect(craftControls({ ...DEFAULTS, shape: 'none' }).ringAvailable).toBe(false);
    expect(craftControls({ ...DEFAULTS, shape: 'shield' }).ringAvailable).toBe(true);
  });

  it('shows stroke width only for outline letters', () => {
    expect(craftControls({ ...DEFAULTS, letterStyle: 'outline' }).showStroke).toBe(true);
    expect(craftControls({ ...DEFAULTS, letterStyle: 'fill' }).showStroke).toBe(false);
  });

  it('shows the second letter color only for a letter gradient', () => {
    expect(craftControls({ ...DEFAULTS, fgFill: 'gradient' }).showLetterEnd).toBe(true);
    expect(craftControls({ ...DEFAULTS, fgFill: 'solid' }).showLetterEnd).toBe(false);
  });

  it('marks weights the family does not ship and reports the fallback', () => {
    const c = craftControls({ ...DEFAULTS, fontId: 'space-grotesk', weight: 800 });
    expect(c.weights.find((w) => w.value === 800)?.available).toBe(false);
    expect(c.weights.find((w) => w.value === 700)?.available).toBe(true);
    expect(c.weightFallback).toBe(700);
    expect(craftControls({ ...DEFAULTS, fontId: 'inter', weight: 800 }).weightFallback).toBeNull();
  });
});

describe('worstContrast', () => {
  it('uses the weakest pair across background and letter gradient stops', () => {
    const s = { ...DEFAULTS, shape: 'circle' as const, bgColor: '#000000', fill: 'solid' as const, fgColor: '#ffffff', fgColor2: '#777777' };
    expect(worstContrast(s)).toBeCloseTo(contrastRatio('#ffffff', '#000000'), 6);
    expect(worstContrast({ ...s, fgFill: 'gradient' })).toBeCloseTo(contrastRatio('#777777', '#000000'), 6);
  });

  it('returns null when there is no background shape', () => {
    expect(worstContrast({ ...DEFAULTS, shape: 'none' })).toBeNull();
  });
});

describe('nextBlobSeed', () => {
  it('always changes the seed and stays in range', () => {
    for (const seed of [1, 7, 999]) {
      for (const r of [0, 0.5, 0.9999]) {
        const next = nextBlobSeed(seed, () => r);
        expect(next).not.toBe(seed);
        expect(next).toBeGreaterThanOrEqual(1);
        expect(next).toBeLessThanOrEqual(999);
      }
    }
  });
});

describe('describeLogo', () => {
  it('describes outline letters and the bare (no shape) mark', () => {
    expect(describeLogo({ ...DEFAULTS, letterStyle: 'outline' }, 'Inter')).toContain('outlined');
    expect(describeLogo({ ...DEFAULTS, shape: 'none' }, 'Inter')).toContain('no background shape');
  });
});

describe('store wiring used by the new controls', () => {
  const s = () => useLogoStore.getState();
  beforeEach(() => s().reset());

  it('applies every Phase 3 field through the validator', () => {
    s().apply({ shape: 'rounded', radius: 31, ring: true, letterStyle: 'outline', stroke: 45 });
    s().apply({ fgFill: 'gradient', fgColor2: '#ABC', weight: 500, rotate1: -12, rotate2: 20, shift: 15 });
    expect(s()).toMatchObject({
      shape: 'rounded', radius: 31, ring: true, letterStyle: 'outline', stroke: 45,
      fgFill: 'gradient', fgColor2: '#aabbcc', weight: 500, rotate1: -12, rotate2: 20, shift: 15,
    });
  });

  it('reset restores the Phase 3 defaults', () => {
    s().apply({ ring: true, rotate2: 30, letterStyle: 'outline' });
    s().reset();
    expect(s()).toMatchObject({ ring: false, rotate2: 0, letterStyle: 'fill' });
  });
});
