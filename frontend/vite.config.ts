import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { demoDataPlugin } from './vite/demoDataPlugin.ts';

// https://vite.dev/config/
export default defineConfig({
  // demoDataPlugin saves company-page reports into src/mocks/data/companies.json (dev only).
  plugins: [react(), demoDataPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // When VITE_ENABLE_MOCKS=false, point this at your backend so that the
    // relative VITE_API_BASE_URL ("/api") reaches it without CORS setup.
    // proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    // Playwright specs live in e2e/ and are run by `npm run e2e`, not Vitest.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**', 'src/**/*.d.ts'],
    },
  },
});
