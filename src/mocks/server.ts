/**
 * Mock Service Worker setup for Node, used by Vitest.
 *
 * The same handlers answer requests in tests as in the browser, so a test that
 * passes is exercising the same contract the app runs against.
 * Started once in `src/test/setup.ts`.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
