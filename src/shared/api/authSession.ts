/**
 * Authentication integration point.
 *
 * This module is deliberately small and replaceable. The API client asks it for
 * a credential before each request and tells it when the server answered 401.
 * Swapping the credential strategy (bearer token -> httpOnly cookie) means
 * changing this file, not the feature code.
 *
 * WHAT IS IMPLEMENTED TODAY
 *   The mock backend issues an opaque session token. It is held in memory and
 *   mirrored into `sessionStorage` so a page reload during a demo does not sign
 *   you out. This is a DEMO convenience against mock data, not a production
 *   decision, and `sessionStorage` is readable by any script on the origin.
 *
 * WHAT MUST BE AGREED WITH THE BACKEND (see docs/backend-integration.md)
 *   Option A - httpOnly, Secure, SameSite cookie set by the backend. The
 *     browser attaches it automatically; the frontend stores nothing. Requires
 *     `credentials: 'include'`, an explicit CORS allow-list with
 *     `Access-Control-Allow-Credentials: true`, and CSRF protection on every
 *     state-changing request. This is the recommended option.
 *   Option B - short-lived access token in memory plus a refresh endpoint
 *     backed by an httpOnly cookie.
 *   Do NOT default to putting a long-lived JWT in `localStorage`.
 */

export interface TokenStorage {
  read(): string | null;
  write(token: string): void;
  clear(): void;
}

/** Keeps the credential only for the lifetime of the JS context. */
export function createMemoryTokenStorage(): TokenStorage {
  let token: string | null = null;
  return {
    read: () => token,
    write: (value) => {
      token = value;
    },
    clear: () => {
      token = null;
    },
  };
}

/**
 * Demo storage: memory plus a `sessionStorage` mirror so reloads keep you
 * signed in while clicking through the mock app. Falls back to memory-only when
 * storage is unavailable (private windows, blocked site data).
 */
export function createSessionStorageTokenStorage(key: string): TokenStorage {
  const memory = createMemoryTokenStorage();

  const safe = <T>(fn: () => T, fallback: T): T => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };

  return {
    read: () => memory.read() ?? safe(() => window.sessionStorage.getItem(key), null),
    write: (value) => {
      memory.write(value);
      safe(() => window.sessionStorage.setItem(key, value), undefined);
    },
    clear: () => {
      memory.clear();
      safe(() => window.sessionStorage.removeItem(key), undefined);
    },
  };
}

/** Cookie strategy: the browser holds the credential, the app stores nothing. */
export function createCookieTokenStorage(): TokenStorage {
  return {
    read: () => null,
    write: () => undefined,
    clear: () => undefined,
  };
}

const SESSION_STORAGE_KEY = 'ship.session.token';

let storage: TokenStorage =
  typeof window === 'undefined'
    ? createMemoryTokenStorage()
    : createSessionStorageTokenStorage(SESSION_STORAGE_KEY);

/** Replace the credential strategy. Call once during app start-up. */
export function setTokenStorage(next: TokenStorage): void {
  storage = next;
}

export function getAuthToken(): string | null {
  return storage.read();
}

export function setAuthToken(token: string): void {
  storage.write(token);
}

export function clearAuthToken(): void {
  storage.clear();
}

/**
 * Centralised handling of 401 responses.
 *
 * Exactly one handler is registered, by `AuthProvider`. It clears the cached
 * session and lets the router show the sign-in prompt. Feature code must not
 * implement its own 401 branch.
 */
type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
