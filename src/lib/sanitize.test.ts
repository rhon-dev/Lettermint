import { describe, expect, it } from 'vitest';
import { displayText, sanitizeText } from './sanitize';

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
