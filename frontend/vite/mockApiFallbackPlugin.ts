import { loadEnv, type Plugin } from 'vite';

/**
 * Dev only, and only while the mock API is on (`VITE_ENABLE_MOCKS=true`).
 *
 * The mock API lives in a Service Worker, so a request to `/api` only reaches
 * the dev server when the worker missed it: the browser had stopped the idle
 * worker and the page hadn't switched mocking back on yet (see
 * `keepMockingActive` in src/mocks/browser.ts). Vite would answer with an empty
 * 404, which the app shows as "Something went wrong". Answer with a retryable
 * 503 instead, so TanStack Query tries again a moment later, by which time the
 * worker is mocking again.
 */
export function mockApiFallbackPlugin(): Plugin {
  return {
    name: 'ship-mock-api-fallback',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, server.config.envDir || process.cwd(), 'VITE_');
      if (env.VITE_ENABLE_MOCKS !== 'true') return;
      const base = (env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');
      // Only a same-origin path can reach this server; a full URL goes elsewhere.
      if (!base.startsWith('/')) return;

      server.middlewares.use(base, (_req, res) => {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Retry-After', '1');
        res.end(
          JSON.stringify({
            code: 'server_error',
            message: 'The demo data is waking up. Please try again.',
          }),
        );
      });
    },
  };
}
