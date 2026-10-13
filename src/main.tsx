/**
 * Application entry point.
 *
 * Mock Service Worker, when enabled, must finish starting before React renders.
 * Otherwise the first queries fire before the worker is listening and fail with
 * a network error on a cold load.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Mantine's styles must load before our own, so our tokens and CSS Modules win.
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@/shared/styles/tokens.css';
import '@/shared/styles/global.css';

import { App } from '@/app/App';
import { env } from '@/shared/config/env';

async function startMockServiceWorker(): Promise<void> {
  if (!env.enableMocks) return;

  // Dynamic import keeps the mock backend and its fixtures out of a build made
  // with VITE_ENABLE_MOCKS=false.
  const { worker } = await import('@/mocks/browser');

  await worker.start({
    // Vite's own asset requests must pass through untouched.
    onUnhandledFrame: 'bypass',
    serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
  });

  console.info(
    '[SHIP] Mock API is running. Every company, post and message is fictional demo data. Set VITE_ENABLE_MOCKS=false to talk to a real backend.',
  );
}

async function bootstrap(): Promise<void> {
  await startMockServiceWorker();

  const container = document.getElementById('root');
  if (!container) throw new Error('Missing #root element in index.html');

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
