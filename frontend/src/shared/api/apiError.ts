/**
 * A single, consistent error shape for every failed request.
 *
 * Hooks and components never inspect `fetch` responses directly - they catch an
 * `ApiError` and read `code`, `status`, `message` or `fieldErrors`.
 */

export type ApiErrorCode =
  | 'network_error'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'conflict'
  | 'rate_limited'
  | 'server_error'
  | 'unknown';

/** Field-level messages keyed by form field name, e.g. `{ weeks: ['Must be 0 or more.'] }`. */
export type FieldErrors = Record<string, string[]>;

/**
 * The error body the frontend expects from the backend. Agreeing on this shape
 * is a backend decision - see docs/api-contract.md "Error responses".
 */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: FieldErrors;
}

const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'validation_error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limited',
};

function codeForStatus(status: number): ApiErrorCode {
  const mapped = STATUS_TO_CODE[status];
  if (mapped) return mapped;
  if (status >= 500) return 'server_error';
  return 'unknown';
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  /** HTTP status, or 0 when the request never reached the server. */
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: FieldErrors;
  /** The parsed response body, kept for debugging. */
  readonly body?: unknown;

  constructor(params: {
    status: number;
    code: ApiErrorCode;
    message: string;
    fieldErrors?: FieldErrors;
    body?: unknown;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.status = params.status;
    this.code = params.code;
    this.fieldErrors = params.fieldErrors;
    this.body = params.body;
  }

  /** The request never reached the server (offline, DNS, CORS preflight, ...). */
  get isNetworkError(): boolean {
    return this.code === 'network_error';
  }

  /** Worth offering a Retry button for. */
  get isRetryable(): boolean {
    return this.code === 'network_error' || this.code === 'server_error' || this.status === 429;
  }

  static fromResponse(status: number, body: unknown): ApiError {
    const parsed = (typeof body === 'object' && body !== null ? body : {}) as ApiErrorBody;
    const code = isApiErrorCode(parsed.code) ? parsed.code : codeForStatus(status);
    return new ApiError({
      status,
      code,
      message: parsed.message?.trim() || DEFAULT_MESSAGE,
      fieldErrors: parsed.fieldErrors,
      body,
    });
  }

  static network(cause?: unknown): ApiError {
    return new ApiError({
      status: 0,
      code: 'network_error',
      message: 'We could not reach the server. Check your connection and try again.',
      body: cause,
    });
  }
}

const API_ERROR_CODES = new Set<string>([
  'network_error',
  'unauthorized',
  'forbidden',
  'not_found',
  'validation_error',
  'conflict',
  'rate_limited',
  'server_error',
  'unknown',
]);

function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === 'string' && API_ERROR_CODES.has(value);
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Safe message for any thrown value. Use this in `ErrorState` so the UI never
 * renders "[object Object]" or an internal stack trace.
 */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return DEFAULT_MESSAGE;
}
