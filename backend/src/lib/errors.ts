import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

/** The error body every endpoint returns. `message` is shown to users as-is. */
export interface ApiErrorBody {
  code: string
  message: string
  fieldErrors: Record<string, string>
}

/** Throw this from a route to return a specific status, code and message. */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
    super(message)
  }
}

function zodFieldErrors(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!(path in fieldErrors)) fieldErrors[path] = issue.message
  }
  return fieldErrors
}

export function errorHandler(
  error: FastifyError | ApiError | ZodError,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ApiError) {
    const body: ApiErrorBody = {
      code: error.code,
      message: error.message,
      fieldErrors: error.fieldErrors,
    }
    return reply.status(error.statusCode).send(body)
  }

  if (error instanceof ZodError) {
    const body: ApiErrorBody = {
      code: 'VALIDATION_ERROR',
      message: 'Some fields are invalid. Please check them and try again.',
      fieldErrors: zodFieldErrors(error),
    }
    return reply.status(400).send(body)
  }

  const statusCode = 'statusCode' in error && error.statusCode ? error.statusCode : 500
  if (statusCode >= 500) {
    request.log.error(error)
    const body: ApiErrorBody = {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our side. Please try again.',
      fieldErrors: {},
    }
    return reply.status(500).send(body)
  }

  const body: ApiErrorBody = {
    code: 'BAD_REQUEST',
    message: error.message,
    fieldErrors: {},
  }
  return reply.status(statusCode).send(body)
}

export function notFoundHandler(_request: FastifyRequest, reply: FastifyReply) {
  const body: ApiErrorBody = {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
    fieldErrors: {},
  }
  return reply.status(404).send(body)
}
