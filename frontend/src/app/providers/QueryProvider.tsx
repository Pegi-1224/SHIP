import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { env } from '@/shared/config/env';
import { createQueryClient } from './queryClient';

export function QueryProvider({ children }: { children: ReactNode }) {
  // useState keeps one client for the lifetime of the app without a module
  // global, which would leak between tests.
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {env.isDev ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
