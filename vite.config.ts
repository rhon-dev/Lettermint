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
        // Precache the app shell, every font file and the license notes so the
        // app works fully offline after the first visit.
        globPatterns: ['**/*.{js,css,html,svg,woff,md}'],
        cleanupOutdatedCaches: true,
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
