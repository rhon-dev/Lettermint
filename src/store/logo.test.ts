import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, LIMITS, clampStep, useLogoStore } from './logo';

const s = () => useLogoStore.getState();

describe('logo store', () => {
  beforeEach(() => s().reset());

  it('starts with the spec defaults', () => {
    expect(s()).toMatchObject({
      text: 'LM',
      uppercase: true,
      bgColor: '#111111',
      fgColor: '#ffffff',
      fontId: 'inter',
      size: 512,
      scale: 55,
    });
    expect(DEFAULTS.size).toBe(512);
  });

  it('sanitizes text', () => {
    s().setText('a-b-c');
    expect(s().text).toBe('ab');
    s().setText('%%');
    expect(s().text).toBe('');
  });

  it('clamps and snaps size to 64–1024 step 8', () => {
    s().setSize(5000);
    expect(s().size).toBe(1024);
    s().setSize(1);
    expect(s().size).toBe(64);
    s().setSize(517);
    expect(s().size).toBe(520);
    s().setSize(Number.NaN);
    expect(s().size).toBe(520);
  });

  it('clamps scale to 30–90', () => {
    s().setScale(95);
    expect(s().scale).toBe(90);
    s().setScale(10);
    expect(s().scale).toBe(30);
    s().setScale(42.4);
    expect(s().scale).toBe(42);
  });

  it('clamps spacing', () => {
    s().setSpacing(100);
    expect(s().spacing).toBe(LIMITS.spacing.max);
    s().setSpacing(-100);
    expect(s().spacing).toBe(LIMITS.spacing.min);
  });

  it('ignores invalid colors, shapes and fonts', () => {
    s().setBgColor('nope');
    s().setFgColor('#12');
    s().setShape('triangle');
    s().setFontId('comic-sans');
    expect(s()).toMatchObject({ bgColor: '#111111', fgColor: '#ffffff', shape: 'circle', fontId: 'inter' });
    s().setBgColor('#ABC');
    s().setShape('squircle');
    s().setFontId('fraunces');
    expect(s()).toMatchObject({ bgColor: '#aabbcc', shape: 'squircle', fontId: 'fraunces' });
  });

  it('clampStep handles bounds and non-finite values', () => {
    expect(clampStep(Infinity, LIMITS.size)).toBeNull();
    expect(clampStep(1020, LIMITS.size)).toBe(1024);
    expect(clampStep(68, LIMITS.size)).toBe(72);
  });
});
