import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end checks for the handful of flows that must work in a real browser:
 * sign-in, search, the privacy threshold, posting, and messaging.
 *
 * They run against the production build served by `vite preview`, with Mock
 * Service Worker enabled - the same mock backend the unit tests use, but
 * driven through a real service worker in a real browser.
 *
 * Run them with:  npm run e2e
 * First time:     npm run e2e:install   (downloads the Chromium build)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  timeout: 45_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
