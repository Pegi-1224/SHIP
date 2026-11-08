/**
 * Mock Service Worker setup for the browser.
 *
 * MSW intercepts at the network layer, so the app's API client issues real
 * `fetch` calls and real `Response` objects come back. Pages and hooks have no
 * idea they are talking to a mock, which is exactly why switching to a real
 * backend needs no change in feature code.
 *
 * Started from `src/main.tsx` only when `VITE_ENABLE_MOCKS=true`.
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

/** How often to remind the worker; matches MSW's own keep-alive ping. */
const REACTIVATE_INTERVAL_MS = 5_000;

/**
 * Keep mocking switched on after the browser restarts the Service Worker.
 *
 * Browsers stop an idle worker (a background tab, a sleeping laptop). When it
 * starts again it has forgotten which pages asked for mocking, so every request
 * passes through to the dev server and fails with "Something went wrong".
 * Re-sending MSW's activation message is harmless when the worker is already
 * active, so do it whenever the page comes back and on a timer.
 */
export function keepMockingActive(): void {
  const reactivate = () => navigator.serviceWorker.controller?.postMessage('MOCK_ACTIVATE');

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reactivate();
  });
  window.addEventListener('focus', reactivate);
  window.addEventListener('online', reactivate);
  window.addEventListener('pageshow', reactivate);
  window.setInterval(reactivate, REACTIVATE_INTERVAL_MS);
}
