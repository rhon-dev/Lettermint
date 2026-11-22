import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { loadEnv, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { renderSiteHtml, robotsTxt, siteUrl, sitemapXml } from './src/lib/site.ts';

/** Fill %SITE_URL% in index.html and emit robots.txt + sitemap.xml from one value. */
function siteFiles(url: string): Plugin {
  return {
    name: 'lettermint-site-files',
    transformIndexHtml: { order: 'pre', handler: (html) => renderSiteHtml(html, url) },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt(url) });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(url) });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    siteFiles(siteUrl(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registered manually in src/registerServiceWorker.ts, after load + idle.
      injectRegister: false,
      manifest: false,
      workbox: {
        // Precache the app shell (UI fonts are .woff2) and license notes. Logo fonts
        // (.woff, ~20 kB each, 60 files) are cached only once used, so a first visit
        // does not download all of them; fonts used before keep working offline.
        globPatterns: ['**/*.{js,css,html,svg,woff2,md,png,ico}'],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.woff'),
            handler: 'CacheFirst',
            options: { cacheName: 'logo-fonts', expiration: { maxEntries: 80 } },
          },
        ],
      },
    }),
  ],
  build: {
    // Keep fonts as separate files so they are fetched lazily, never inlined.
    assetsInlineLimit: 0,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
