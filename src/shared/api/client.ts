/**
 * The single HTTP entry point for the whole app.
 *
 * Feature API functions call `api.get` / `api.post` / ... and never call
 * `fetch` themselves. That keeps base URL, JSON encoding, auth headers, error
 * normalisation and 401 handling in one place.
 *
 * Request flow:
 *   feature api fn -> apiRequest -> fetch -> MSW (mock mode) or the backend
 *                                        -> ApiError on failure
 */
import { env } from '@/shared/config/env';
import { ApiError } from './apiError';
import { getAuthToken, notifyUnauthorized } from './authSession';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Values that may appear in a query string. `undefined` and `null` are dropped. */
export type QueryValue = string | number | boolean | undefined | null | Array<string | number>;

export interface RequestOptions {
  method?: HttpMethod;
  /** Serialised as JSON. Use `undefined` for requests without a body. */
  body?: unknown;
  query?: Record<string, QueryValue>;
  /** Lets TanStack Query cancel in-flight requests. Always forward it. */
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /**
   * Attach the session credential. Defaults to true; set false for the
   * endpoints that must work signed-out (sign-in, public previews).
   */
  auth?: boolean;
  /**
   * Skip the central 401 handler. Only the auth feature needs this, so that a
   * failed sign-in attempt does not look like an expired session.
   */
  skipUnauthorizedHandler?: boolean;
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = env.apiBaseUrl.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${suffix}`;

  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, String(item));
    } else {
      params.set(key, String(value));
    }
  }

  const serialised = params.toString();
  return serialised ? `${url}?${serialised}` : url;
}

/** True when the response carries no body worth parsing. */
function hasNoBody(response: Response): boolean {
  if (response.status === 204 || response.status === 205) return true;
  if (response.headers.get('content-length') === '0') return true;
  return false;
}

async function parseBody(response: Response): Promise<unknown> {
  if (hasNoBody(response)) return undefined;

  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  if (text.length === 0) return undefined;

  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // A malformed JSON body is a server problem, not a client one.
      return undefined;
    }
  }
  return text;
}

/**
 * Perform a request and return the parsed JSON body.
 *
 * Throws `ApiError` for any non-2xx response or transport failure. Abort
 * errors are rethrown untouched so TanStack Query recognises a cancellation
 * rather than treating it as a failure.
 */
export async function apiRequest<TResponse = void>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const {
    method = 'GET',
    body,
    query,
    signal,
    headers,
    auth = true,
    skipUnauthorizedHandler = false,
  } = options;

  const requestHeaders = new Headers({ Accept: 'application/json', ...headers });

  let payload: string | undefined;
  if (body !== undefined) {
    payload = JSON.stringify(body);
    requestHeaders.set('Content-Type', 'application/json');
  }

  if (auth) {
    const token = getAuthToken();
    if (token) requestHeaders.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: requestHeaders,
      body: payload,
      signal,
      // Switch to 'include' when the backend moves to httpOnly cookies. That
      // also requires an explicit CORS allow-list on the server.
      credentials: 'same-origin',
    });
  } catch (cause) {
    // Rethrow cancellations untouched so TanStack Query treats them as
    // cancellations, not failures. The name check rather than
    // `instanceof DOMException` is deliberate: jsdom and Node each have their
    // own DOMException class, so the instance check is unreliable in tests.
    if (signal?.aborted) throw cause;
    if (cause instanceof Error && cause.name === 'AbortError') throw cause;
    throw ApiError.network(cause);
  }

  const parsed = await parseBody(response);

  if (!response.ok) {
    const error = ApiError.fromResponse(response.status, parsed);
    if (error.code === 'unauthorized' && !skipUnauthorizedHandler) {
      notifyUnauthorized();
    }
    throw error;
  }

  // Endpoints such as DELETE answer 204. Callers type those as `void`.
  return parsed as TResponse;
}

type BodylessOptions = Omit<RequestOptions, 'method' | 'body'>;
type BodyOptions = Omit<RequestOptions, 'method'>;

export const api = {
  get: <T>(path: string, options?: BodylessOptions) => apiRequest<T>(path, { ...options }),
  post: <T = void>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  put: <T = void>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  patch: <T = void>(path: string, body?: unknown, options?: BodyOptions) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T = void>(path: string, options?: BodylessOptions) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
