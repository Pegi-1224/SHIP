import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { demoDataPlugin } from './vite/demoDataPlugin.ts';
import { mockApiFallbackPlugin } from './vite/mockApiFallbackPlugin.ts';

// https://vite.dev/config/
export default defineConfig({
  // demoDataPlugin saves company-page reports into src/mocks/data/companies.json (dev only).
  // mockApiFallbackPlugin turns an /api request the mock worker missed into a retryable 503.
  plugins: [react(), demoDataPlugin(), mockApiFallbackPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // With VITE_ENABLE_MOCKS=false, "/api" goes to the backend in ../backend
    // (`npm run dev` there, port 3000), so no CORS setup is needed. While mocks
    // are on, the mock worker answers first and this is never reached.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
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
