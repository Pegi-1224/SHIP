/**
 * Shared helpers for the mock handlers.
 *
 * They exist so every handler produces the same error envelope the real
 * backend is expected to produce (see docs/api-contract.md), and so
 * authorisation is checked in one place rather than per endpoint.
 */
import { HttpResponse, delay } from 'msw';
import type { ApiErrorBody, ApiErrorCode, FieldErrors } from '@/shared/api';
import type { Paginated } from '@/shared/types/common';
import { env } from '@/shared/config/env';
import { db } from './db';
import type { MockUser } from './types';

/** Base path every mock route is mounted under. Matches VITE_API_BASE_URL. */
export const API = env.apiBaseUrl.replace(/\/+$/, '') || '/api';

export function url(path: string): string {
  return `${API}${path.startsWith('/') ? path : `/${path}`}`;
}

/** A little latency so loading states are actually visible while developing. */
export async function simulateLatency(ms = 220): Promise<void> {
  await delay(ms);
}

export function errorResponse(
  status: number,
  code: ApiErrorCode,
  message: string,
  fieldErrors?: FieldErrors,
): Response {
  const body: ApiErrorBody = { code, message };
  if (fieldErrors) body.fieldErrors = fieldErrors;
  return HttpResponse.json(body, { status });
}

export const unauthorized = (message = 'Please sign in to continue.') =>
  errorResponse(401, 'unauthorized', message);

export const forbidden = (message = 'You do not have access to this.') =>
  errorResponse(403, 'forbidden', message);

export const notFound = (message = 'We could not find what you were looking for.') =>
  errorResponse(404, 'not_found', message);

export const validationError = (message: string, fieldErrors?: FieldErrors) =>
  errorResponse(422, 'validation_error', message, fieldErrors);

export const conflict = (message: string) => errorResponse(409, 'conflict', message);

/**
 * Resolve the session from the Authorization header.
 *
 * Returns `null` when there is no valid session. Handlers must then answer 401
 * themselves - exactly as a real backend would, rather than trusting anything
 * the client claims about who it is.
 */
export function currentUser(request: Request): MockUser | null {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length).trim();
  const userId = db().sessions[token];
  if (!userId) return null;

  return db().users.find((user) => user.id === userId) ?? null;
}

export function paginate<T>(items: readonly T[], page = 1, pageSize = 20): Paginated<T> {
  const safePage = Math.max(1, Math.floor(page));
  const safeSize = Math.min(Math.max(1, Math.floor(pageSize)), 100);
  const start = (safePage - 1) * safeSize;
  const slice = items.slice(start, start + safeSize);

  return {
    items: slice,
    page: safePage,
    pageSize: safeSize,
    total: items.length,
    hasMore: start + slice.length < items.length,
  };
}

export function readPagination(request: Request): { page: number; pageSize: number } {
  const params = new URL(request.url).searchParams;
  return {
    page: Number(params.get('page') ?? '1') || 1,
    pageSize: Number(params.get('pageSize') ?? '20') || 20,
  };
}

export function searchParam(request: Request, key: string): string {
  return new URL(request.url).searchParams.get(key)?.trim() ?? '';
}
