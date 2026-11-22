import { describe, expect, it } from 'vitest';
import { displayText, MAX_NAME, NAME_HINT, sanitizeName, sanitizeText, unsupportedInitials } from './sanitize';

describe('unsupportedInitials', () => {
  it('lists each rejected character once, in typing order', () => {
    expect(unsupportedInitials('Éé-É')).toEqual(['É', 'é', '-']);
  });

  it('names whitespace instead of showing a blank', () => {
    expect(unsupportedInitials('A B')).toEqual(['space']);
  });

  it('is empty for valid input, even past the length limit', () => {
    expect(unsupportedInitials('ab&9')).toEqual([]);
  });
});

describe('sanitizeName', () => {
  it('removes HTML tags whole instead of leaving their letters', () => {
    expect(sanitizeName('<b>Zoë & Co</b>')).toBe('Zoë & Co');
    expect(sanitizeName('<script>alert(1)</script>')).toBe('alert1');
    expect(sanitizeName('Lena <img src=x onerror=alert(1)')).toBe('Lena ');
  });

  it('keeps only Latin letters, numbers, spaces and &', () => {
    expect(sanitizeName('Lena-Müller, Inc. 2026!')).toBe('LenaMüller Inc 2026');
    expect(sanitizeName('Ж日本 A&B')).toBe('A&B');
  });

  it('collapses spaces, drops leading ones and keeps a trailing one for typing', () => {
    expect(sanitizeName('   Lena    Studio ')).toBe('Lena Studio ');
    expect(sanitizeName('x'.repeat(50))).toHaveLength(MAX_NAME);
  });

  it('documents the Latin-only limit for the name field hint', () => {
    expect(NAME_HINT).toMatch(/Latin letters/);
  });
});

describe('sanitizeText', () => {
  it('keeps allowed characters and preserves case', () => {
    expect(sanitizeText('Lm')).toBe('Lm');
    expect(sanitizeText('a&')).toBe('a&');
    expect(sanitizeText('09')).toBe('09');
  });

  it('silently drops disallowed characters', () => {
    expect(sanitizeText('a-b')).toBe('ab');
    expect(sanitizeText(' x ')).toBe('x');
    expect(sanitizeText('é!?@#$%')).toBe('');
    expect(sanitizeText('😀Z')).toBe('Z');
    expect(sanitizeText('ＡＢ')).toBe(''); // full-width letters are not A–Z
  });

  it('caps at two characters', () => {
    expect(sanitizeText('ABC')).toBe('AB');
    expect(sanitizeText('-A-B-C')).toBe('AB');
  });

  it('allows empty input', () => {
    expect(sanitizeText('')).toBe('');
  });
});

describe('displayText', () => {
  it('uppercases only when enabled', () => {
    expect(displayText('lm', true)).toBe('LM');
    expect(displayText('lm', false)).toBe('lm');
    expect(displayText('&g', true)).toBe('&G');
  });
});
