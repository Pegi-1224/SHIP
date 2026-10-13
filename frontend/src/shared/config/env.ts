/**
 * Typed access to the build-time environment.
 *
 * Every `VITE_`-prefixed variable is inlined into the bundle and is therefore
 * public. Nothing secret belongs here. See `.env.example`.
 */

function readString(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

export const env = {
  /** Prefix for every path passed to the shared API client, e.g. `/api`. */
  apiBaseUrl: readString(import.meta.env.VITE_API_BASE_URL, '/api'),

  /**
   * When true the app starts Mock Service Worker and every request is answered
   * by the in-browser mock backend in `src/mocks`. When false MSW never starts
   * and requests go to `apiBaseUrl` for real - a failure there is a real
   * failure and is never replaced by a mock success.
   */
  enableMocks: readString(import.meta.env.VITE_ENABLE_MOCKS, 'true') === 'true',

  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
} as const;

export type AppEnv = typeof env;
