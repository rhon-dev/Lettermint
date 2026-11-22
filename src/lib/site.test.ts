import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SITE_URL, DISCLAIMER, TAGLINE, renderSiteHtml, robotsTxt, siteUrl, sitemapXml } from './site';

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');

describe('siteUrl', () => {
  it('falls back to the documented default when unset or blank', () => {
    expect(siteUrl(undefined)).toBe(DEFAULT_SITE_URL);
    expect(siteUrl('   ')).toBe(DEFAULT_SITE_URL);
  });

  it('trims whitespace and trailing slashes', () => {
    expect(siteUrl(' https://lettermint.vercel.app/ ')).toBe('https://lettermint.vercel.app');
  });

  it('rejects values that are not an http(s) origin, so a typo fails the build', () => {
    expect(() => siteUrl('lettermint.vercel.app')).toThrow(/VITE_SITE_URL/);
    expect(() => siteUrl('ftp://lettermint.vercel.app')).toThrow(/VITE_SITE_URL/);
    expect(() => siteUrl('https://lettermint.vercel.app/app?x=1')).toThrow(/VITE_SITE_URL/);
  });
});

describe('generated SEO files', () => {
  it('robots.txt points at the sitemap on the site URL', () => {
    expect(robotsTxt('https://a.example')).toBe('User-agent: *\nAllow: /\n\nSitemap: https://a.example/sitemap.xml\n');
  });

  it('sitemap.xml lists the site root', () => {
    expect(sitemapXml('https://a.example')).toContain('<loc>https://a.example/</loc>');
  });

  it('renderSiteHtml fills every %SITE_URL% placeholder', () => {
    expect(renderSiteHtml('<a href="%SITE_URL%/">%SITE_URL%/x</a>', 'https://a.example')).toBe(
      '<a href="https://a.example/">https://a.example/x</a>',
    );
  });
});

describe('launch copy', () => {
  const html = read('index.html');

  it('has no hardcoded site domain left in index.html or public/', () => {
    expect(html).not.toMatch(/https?:\/\/(?!%SITE_URL%)[^"\s]*lettermint/i);
    expect(html).not.toContain('example.com');
    expect(() => read('public/robots.txt')).toThrow();
    expect(() => read('public/sitemap.xml')).toThrow();
  });

  it('uses the tagline in the title, description, Open Graph and Twitter tags', () => {
    expect(html).toContain(`<title>${TAGLINE}</title>`);
    for (const tag of ['name="description"', 'property="og:title"', 'property="og:description"', 'name="twitter:title"', 'name="twitter:description"']) {
      const content = new RegExp(`${tag}\\s+content="([^"]*)"`).exec(html)?.[1];
      expect(content, tag).toContain(TAGLINE);
    }
  });

  it('README leads with the tagline and ends with the disclaimer', () => {
    const readme = read('README.md').trimEnd();
    expect(readme.split('\n')[0]).toBe(`# ${TAGLINE}`);
    expect(readme.endsWith(DISCLAIMER)).toBe(true);
  });
});
