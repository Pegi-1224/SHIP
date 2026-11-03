import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError, type z } from 'zod'

/** Keyed by form field; dotted paths for nested sections. */
export type FieldErrors = Record<string, string[]>

/**
 * The error body every non-2xx response uses (frontend/docs/api-contract.md, "Errors").
 * `message` is shown to users verbatim, so it must read as a sentence for a person.
 */
export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors?: FieldErrors
}

const STATUS_TO_CODE: Record<number, string> = {
  400: 'validation_error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limited',
}

function codeForStatus(status: number): string {
  return STATUS_TO_CODE[status] ?? (status >= 500 ? 'server_error' : 'validation_error')
}

/** Throw this from a route to return a specific status, code and message. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: FieldErrors,
  ) {
    super(message)
  }
}

export const notFound = (message = 'We could not find what you were looking for.') =>
  new ApiError(404, 'not_found', message)

export const unauthorized = (message = 'Please sign in to continue.') =>
  new ApiError(401, 'unauthorized', message)

export const validationError = (message: string, fieldErrors?: FieldErrors) =>
  new ApiError(422, 'validation_error', message, fieldErrors)

export const forbidden = (message = 'You do not have access to this.') =>
  new ApiError(403, 'forbidden', message)

export const conflict = (message: string) => new ApiError(409, 'conflict', message)

export const rateLimited = (message: string) => new ApiError(429, 'rate_limited', message)

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    ;(fieldErrors[path] ??= []).push(issue.message)
  }
  return fieldErrors
}

/** Validate a request body or query; on failure answer 422 with a message per field. */
export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
  message = 'Please fix the highlighted fields.',
): z.output<T> {
  const result = schema.safeParse(data)
  if (!result.success) throw validationError(message, zodFieldErrors(result.error))
  return result.data
}

export function errorHandler(
  error: FastifyError | ApiError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = { code: error.code, message: error.message }
    if (error.fieldErrors) body.fieldErrors = error.fieldErrors
    return reply.status(error.statusCode).send(body)
  }

  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      code: 'validation_error',
      message: 'Some fields are invalid. Please check them and try again.',
      fieldErrors: zodFieldErrors(error),
    }
    return reply.status(422).send(body)
  }

  const statusCode = 'statusCode' in error && error.statusCode ? error.statusCode : 500
  if (statusCode >= 500) {
    request.log.error(error)
    const body: ApiErrorBody = {
      code: 'server_error',
      message: 'Something went wrong on our side. Please try again.',
    }
    return reply.status(statusCode).send(body)
  }

  const body: ApiErrorBody = { code: codeForStatus(statusCode), message: error.message }
  return reply.status(statusCode).send(body)
}

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
  const body: ApiErrorBody = {
    code: 'not_found',
    message: 'The requested resource was not found.',
  }
  return reply.status(404).send(body)
}
