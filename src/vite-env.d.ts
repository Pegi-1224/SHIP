/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL prefixed onto every API request path. See `.env.example`. */
  readonly VITE_API_BASE_URL?: string;
  /** "true" starts Mock Service Worker; anything else disables it. */
  readonly VITE_ENABLE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
