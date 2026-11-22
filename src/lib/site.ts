// Site identity for SEO files. vite.config.ts reads VITE_SITE_URL at build time;
// see README "Deploy (Vercel)" for where to set it.
export const DEFAULT_SITE_URL = 'https://lettermint-tau.vercel.app';
export const TAGLINE = 'Lettermint: free initials logo maker';
export const DISCLAIMER = 'Not affiliated with lettermint.co.';

/** Normalise VITE_SITE_URL to a bare origin (no trailing slash); blank means the default. */
export function siteUrl(raw: string | undefined): string {
  const value = raw?.trim().replace(/\/+$/, '') ?? '';
  if (!value) return DEFAULT_SITE_URL;
  let url: URL | null = null;
  try {
    url = new URL(value);
  } catch {
    // reported below
  }
  if (!url || !/^https?:$/.test(url.protocol) || url.origin !== value) {
    throw new Error(`VITE_SITE_URL must be an origin like https://lettermint.vercel.app, got "${raw}"`);
  }
  return value;
}

export function renderSiteHtml(html: string, url: string): string {
  return html.replaceAll('%SITE_URL%', url);
}

export function robotsTxt(url: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${url}/sitemap.xml\n`;
}

export function sitemapXml(url: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${url}/</loc></url>`,
    '</urlset>',
    '',
  ].join('\n');
}
