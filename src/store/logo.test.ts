import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULTS, LIMITS, clampStep, useLogoStore } from './logo';

const s = () => useLogoStore.getState();

describe('logo store', () => {
  beforeEach(() => s().reset());

  it('sanitizes the brand name on every write path', () => {
    s().setBrandName('<b>Lena</b> & Co');
    expect(s().brandName).toBe('Lena & Co');
    s().apply({ brandName: '<script>x</script>Ж' });
    expect(s().brandName).toBe('x');
    s().apply({ brandName: 42 });
    expect(s().brandName).toBe('x');
  });

  it('starts with the spec defaults', () => {
    expect(s()).toMatchObject({
      text: 'LM',
      uppercase: true,
      shape: 'none',
      fgColor: '#111111',
      fontId: 'fraunces',
      weight: 800,
      size: 512,
      scale: 62,
      layout: 'row',
      knockout: 16,
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
    expect(s()).toMatchObject({ bgColor: '#e7e5e4', fgColor: '#111111', shape: 'none', fontId: 'fraunces' });
    s().setBgColor('#ABC');
    s().setShape('squircle');
    s().setFontId('inter');
    expect(s()).toMatchObject({ bgColor: '#aabbcc', shape: 'squircle', fontId: 'inter' });
  });

  it('clampStep handles bounds and non-finite values', () => {
    expect(clampStep(Infinity, LIMITS.size)).toBeNull();
    expect(clampStep(1020, LIMITS.size)).toBe(1024);
    expect(clampStep(68, LIMITS.size)).toBe(72);
  });
});
