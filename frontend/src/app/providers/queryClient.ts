import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/shared/api';

/**
 * Builds the app's query client.
 *
 * Exported separately from `QueryProvider` so tests can create a fresh,
 * retry-free client per test instead of sharing a cache between them - see
 * `src/test/renderWithProviders.tsx`.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying a 404 or a validation error only delays the error state.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && !error.isRetryable) return false;
          return failureCount < 2;
        },
        refetchOnWindowFocus: false,
      },
      mutations: {
        // A failed mutation is surfaced to the user with a Retry control
        // rather than retried silently, so they keep control of their data.
        retry: false,
      },
    },
  });
}
