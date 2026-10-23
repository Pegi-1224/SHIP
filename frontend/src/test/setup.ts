/**
 * Vitest global setup.
 *
 * Starts the same MSW handlers the browser uses, so component tests exercise
 * the real request/response path rather than stubbed hooks, and resets the
 * mock database between tests so they cannot leak state into each other.
 */
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { notifications } from '@mantine/notifications';
import { server } from '@/mocks/server';
import { resetMockDatabase } from '@/mocks/db';
import { resetDemoSearchData } from '@/mocks/handlers/demoSearch';
import { clearAuthToken } from '@/shared/api';

// Mantine components read these; jsdom implements neither.
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;

  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }

  // jsdom has no FontFaceSet. Mantine's autosizing Textarea subscribes to
  // `document.fonts` so it can re-measure once webfonts load.
  if (!('fonts' in document)) {
    Object.defineProperty(document, 'fonts', {
      writable: true,
      value: {
        ready: Promise.resolve(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
  }

  // An unhandled frame (request) means a test hit an endpoint with no handler,
  // which is a bug in either the test or the contract. Fail loudly.
  server.listen({ onUnhandledFrame: 'error' });
});

beforeEach(() => {
  resetMockDatabase();
  resetDemoSearchData();
  clearAuthToken();
});

afterEach(() => {
  cleanup();
  // Mantine's notification store is a module singleton, so a toast raised by
  // one test would otherwise still be queued when the next one renders.
  notifications.clean();
  server.resetHandlers();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterAll(() => {
  server.close();
});
