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
