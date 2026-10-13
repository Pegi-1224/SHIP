/**
 * The shared API layer's public surface.
 *
 * Feature code imports from `@/shared/api`, never from the individual files, so
 * the internals (error shape, token strategy) can change in one place.
 */
export { api, apiRequest } from './client';
export type { HttpMethod, RequestOptions, QueryValue } from './client';

export { ApiError, isApiError, getErrorMessage } from './apiError';
export type { ApiErrorCode, ApiErrorBody, FieldErrors } from './apiError';

export { queryKeys } from './queryKeys';

export {
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  setTokenStorage,
  setUnauthorizedHandler,
  createMemoryTokenStorage,
  createCookieTokenStorage,
  createSessionStorageTokenStorage,
} from './authSession';
export type { TokenStorage } from './authSession';
