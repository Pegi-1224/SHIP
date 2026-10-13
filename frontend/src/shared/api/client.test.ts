/**
 * The shared API client is the one place every request passes through, so its
 * edge cases are worth pinning down: empty bodies, error shapes, auth headers
 * and cancellation.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { type ApiError, api, apiRequest, isApiError } from './index';
import { clearAuthToken, setAuthToken, setUnauthorizedHandler } from './authSession';

afterEach(() => {
  clearAuthToken();
  setUnauthorizedHandler(null);
});

describe('apiRequest', () => {
  it('returns undefined for a 204 instead of trying to parse a body', async () => {
    server.use(http.delete('/api/thing', () => new HttpResponse(null, { status: 204 })));

    await expect(api.delete('/thing')).resolves.toBeUndefined();
  });

  it('parses a JSON body', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({ name: 'ok' })));

    await expect(api.get<{ name: string }>('/thing')).resolves.toEqual({ name: 'ok' });
  });

  it('builds a query string and drops empty values', async () => {
    let seen = '';
    server.use(
      http.get('/api/thing', ({ request }) => {
        seen = new URL(request.url).search;
        return HttpResponse.json({});
      }),
    );

    await api.get('/thing', {
      query: { q: 'pay gap', page: 2, empty: '', missing: undefined, nothing: null, tags: ['a', 'b'] },
    });

    expect(seen).toContain('q=pay+gap');
    expect(seen).toContain('page=2');
    expect(seen).toContain('tags=a&tags=b');
    expect(seen).not.toContain('empty');
    expect(seen).not.toContain('missing');
    expect(seen).not.toContain('nothing');
  });

  it('turns an error response into an ApiError with the server message', async () => {
    server.use(
      http.get('/api/thing', () =>
        HttpResponse.json(
          { code: 'validation_error', message: 'Please enter a number.', fieldErrors: { weeks: ['Required'] } },
          { status: 422 },
        ),
      ),
    );

    const error = await api.get('/thing').catch((caught: unknown) => caught);

    expect(isApiError(error)).toBe(true);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe('validation_error');
    expect(apiError.message).toBe('Please enter a number.');
    expect(apiError.fieldErrors).toEqual({ weeks: ['Required'] });
    // Nothing to gain from retrying a validation error.
    expect(apiError.isRetryable).toBe(false);
  });

  it('falls back to a readable message when the error body is empty', async () => {
    server.use(http.get('/api/thing', () => new HttpResponse(null, { status: 500 })));

    const error = (await api.get('/thing').catch((caught: unknown) => caught)) as ApiError;

    expect(error.code).toBe('server_error');
    expect(error.message).toBe('Something went wrong. Please try again.');
    expect(error.isRetryable).toBe(true);
  });

  it('reports a transport failure as a network error', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.error()));

    const error = (await api.get('/thing').catch((caught: unknown) => caught)) as ApiError;

    expect(error.isNetworkError).toBe(true);
    expect(error.status).toBe(0);
    expect(error.isRetryable).toBe(true);
  });

  it('attaches the session credential, and omits it when asked', async () => {
    const headers: string[] = [];
    server.use(
      http.get('/api/thing', ({ request }) => {
        headers.push(request.headers.get('Authorization') ?? 'none');
        return HttpResponse.json({});
      }),
    );

    setAuthToken('token-123');
    await api.get('/thing');
    await api.get('/thing', { auth: false });

    expect(headers).toEqual(['Bearer token-123', 'none']);
  });

  it('calls the single unauthorized handler exactly once on a 401', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    server.use(
      http.get('/api/thing', () =>
        HttpResponse.json({ code: 'unauthorized', message: 'Sign in.' }, { status: 401 }),
      ),
    );

    await api.get('/thing').catch(() => undefined);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('skips the unauthorized handler when the caller opts out', async () => {
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    server.use(
      http.get('/api/thing', () =>
        HttpResponse.json({ code: 'unauthorized', message: 'Sign in.' }, { status: 401 }),
      ),
    );

    await api.get('/thing', { skipUnauthorizedHandler: true }).catch(() => undefined);

    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('rethrows an abort so a cancellation is not mistaken for a failure', async () => {
    server.use(http.get('/api/thing', () => HttpResponse.json({})));

    const controller = new AbortController();
    controller.abort();

    const error = await apiRequest('/thing', { signal: controller.signal }).catch(
      (caught: unknown) => caught,
    );

    expect(isApiError(error)).toBe(false);
    expect((error as Error).name).toBe('AbortError');
  });
});
