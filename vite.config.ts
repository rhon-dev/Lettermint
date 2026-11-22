import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
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
});
