import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse, type Font } from 'opentype.js';
import { describe, expect, it } from 'vitest';
import { buildLogo } from './buildLogo';
import { contrastRatio, relativeLuminance } from './color';
import {
  brandPalette,
  buildLockup,
  kitTextFiles,
  ogBackground,
  ogSvg,
  paletteCss,
  STEPS,
  tailwindConfig,
  webManifest,
} from './brandkit';
import { icoFromPngs } from './ico';
import { crc32, zipFiles } from './zip';
import { DEFAULTS } from '../store/logo';

const root = fileURLToPath(new URL('../../', import.meta.url));
function loadTestFont(pkg: string, weight: number): Font {
  const buf = readFileSync(`${root}node_modules/@fontsource/${pkg}/files/${pkg}-latin-${weight}-normal.woff`);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

const enc = (s: string) => new TextEncoder().encode(s);
const u16 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset).getUint16(o, true);
const u32 = (b: Uint8Array, o: number) => new DataView(b.buffer, b.byteOffset).getUint32(o, true);

describe('crc32', () => {
  it('matches the standard check value', () => {
    expect(crc32(enc('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('zipFiles', () => {
  const files = [
    { name: 'a.txt', data: enc('hello') },
    { name: 'icons/b.bin', data: new Uint8Array([0, 1, 2, 255]) },
  ];
  const zip = zipFiles(files, new Date(2026, 10, 22, 9, 30, 0));

  it('writes a central directory that points at every stored entry', () => {
    const eocd = zip.length - 22;
    expect(u32(zip, eocd)).toBe(0x06054b50);
    expect(u16(zip, eocd + 10)).toBe(2);
    let p = u32(zip, eocd + 16);
    for (const f of files) {
      expect(u32(zip, p)).toBe(0x02014b50);
      expect(u16(zip, p + 10)).toBe(0); // stored, no compression
      expect(u32(zip, p + 16)).toBe(crc32(f.data));
      expect(u32(zip, p + 20)).toBe(f.data.length);
      const nameLen = u16(zip, p + 28);
      expect(new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLen))).toBe(f.name);
      const local = u32(zip, p + 42);
      expect(u32(zip, local)).toBe(0x04034b50);
      const start = local + 30 + u16(zip, local + 26) + u16(zip, local + 28);
      expect(Array.from(zip.subarray(start, start + f.data.length))).toEqual(Array.from(f.data));
      p += 46 + nameLen;
    }
  });

  it('encodes the DOS timestamp', () => {
    const time = u16(zip, 10);
    const date = u16(zip, 12);
    expect(time >> 11).toBe(9);
    expect((time >> 5) & 63).toBe(30);
    expect(date >> 9).toBe(2026 - 1980);
    expect((date >> 5) & 15).toBe(11);
    expect(date & 31).toBe(22);
  });
});

describe('icoFromPngs', () => {
  it('wraps PNG images in an ICO directory', () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5, 6, 7]);
    const ico = icoFromPngs([
      { size: 16, data: a },
      { size: 256, data: b },
    ]);
    expect([u16(ico, 0), u16(ico, 2), u16(ico, 4)]).toEqual([0, 1, 2]);
    expect(ico[6]).toBe(16);
    expect(ico[6 + 16]).toBe(0); // 256 is stored as 0
    expect(u32(ico, 6 + 8)).toBe(3);
    const offB = u32(ico, 6 + 16 + 12);
    expect(Array.from(ico.subarray(offB, offB + 4))).toEqual([4, 5, 6, 7]);
    expect(ico.length).toBe(6 + 32 + 7);
  });
});

describe('brandPalette', () => {
  const p = brandPalette('#047857');

  it('keeps the brand colour at 500 and orders steps light to dark', () => {
    expect(p.scale[500]).toBe('#047857');
    const steps = STEPS.map((s) => relativeLuminance(p.scale[s]));
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeLessThan(steps[i - 1]!);
  });

  it('keeps the exact brand colour as the base even when 500 is clamped', () => {
    expect(brandPalette('#111111').base).toBe('#111111');
    expect(paletteCss(brandPalette('#000000'), '#ffffff')).toContain('--brand: #000000;');
  });

  it('produces visibly distinct steps for very dark, very light and grey colours', () => {
    for (const base of ['#000000', '#111111', '#ffffff', '#777777', '#fde68a', '#047857', '#4c1d95', '#ff0000', '#00ffff']) {
      const p = brandPalette(base);
      for (let i = 1; i < STEPS.length; i++) {
        const a = p.scale[STEPS[i - 1]!];
        const b = p.scale[STEPS[i]!];
        expect(relativeLuminance(b), `${base} ${STEPS[i]}`).toBeLessThan(relativeLuminance(a));
        expect(contrastRatio(a, b), `${base} ${STEPS[i - 1]}/${STEPS[i]}`).toBeGreaterThanOrEqual(1.1);
      }
    }
  });

  it('rotates the hue for the complement', () => {
    expect(brandPalette('#ff0000').complement).toBe('#00ffff');
    expect(brandPalette('#777777').complement).toBe('#777777');
  });

  it('exports CSS variables and a Tailwind config', () => {
    const css = paletteCss(p, '#ffffff');
    expect(css).toContain('--brand-50: ');
    expect(css).toContain('--brand-500: #047857;');
    expect(css).toContain('--brand-on: #ffffff;');
    expect(css).toContain(`--brand-complement: ${p.complement};`);
    const tw = tailwindConfig(p, '#ffffff');
    expect(tw).toContain("500: '#047857'");
    expect(tw).toMatch(/module\.exports = \{/);
  });
});

describe('webManifest', () => {
  it('lists the PWA icons and brand colours', () => {
    const m = JSON.parse(webManifest('Lena Studio', '#047857', '#ffffff'));
    expect(m.name).toBe('Lena Studio');
    expect(m.theme_color).toBe('#047857');
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512']);
  });
});

describe('ogBackground', () => {
  it('picks whichever end of the scale contrasts more with the ink', () => {
    const dark = brandPalette('#111111');
    expect(ogBackground(dark, '#111111')).toBe(dark.scale[50]);
    const light = brandPalette('#fde68a');
    expect(ogBackground(light, '#fde68a')).toBe(light.scale[950]);
  });
});

describe('buildLockup', () => {
  const font = loadTestFont('inter', 700);
  const state = { ...DEFAULTS };
  const geo = buildLogo(state, font);

  it('places the name to the right of the mark when horizontal', () => {
    const l = buildLockup(state, geo, font, 'Lena Studio', 'horizontal');
    expect(l.width).toBeGreaterThan(l.height * 2);
    expect(l.svg).toMatch(/^<svg [^>]*viewBox="0 0 [\d.]+ [\d.]+"/);
    expect(l.svg).toContain('<title>Lena Studio</title>');
    expect(l.svg).toContain(`fill="${state.bgColor}"`);
  });

  it('stacks the name under the mark when stacked', () => {
    const l = buildLockup(state, geo, font, 'Lena Studio', 'stacked');
    expect(l.height).toBeGreaterThan(512);
  });

  it('falls back to the bare mark without a name', () => {
    const l = buildLockup(state, geo, font, '', 'horizontal');
    expect([l.width, l.height]).toEqual([512, 512]);
  });

  it('uses the letter colour for shapeless marks', () => {
    const l = buildLockup({ ...state, shape: 'none', fgColor: '#123456' }, geo, font, 'Ab', 'horizontal');
    expect(l.svg).toContain('fill="#123456"');
  });

  it('composes a 1200×630 OG image', () => {
    const p = brandPalette(state.bgColor);
    const svg = ogSvg(buildLockup(state, geo, font, 'Lena', 'horizontal'), ogBackground(p, state.bgColor));
    expect(svg).toContain('width="1200" height="630"');
    expect(contrastRatio(ogBackground(p, state.bgColor), state.bgColor)).toBeGreaterThan(4.5);
  });
});

describe('kitTextFiles', () => {
  it('ships the manifest, palette, Tailwind config and a readme', () => {
    const files = kitTextFiles({ name: 'Lena', ink: '#047857', on: '#ffffff', logoSvg: '<svg/>', lockups: [] });
    const names = files.map((f) => f.name);
    expect(names).toEqual(['logo.svg', 'site.webmanifest', 'palette.css', 'tailwind.config.js', 'README.txt']);
  });
});
