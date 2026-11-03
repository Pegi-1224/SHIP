import type { FastifyBaseLogger } from 'fastify'
import { config } from '../config.js'

/**
 * Delivers a sign-in code. There is no mail service yet, so in development this writes the code
 * to the server log. In production it refuses to run, so a code can never end up in a log:
 * replace the body with a real provider (SES, Postmark, Resend...) before launch; callers will
 * not need to change.
 */
export async function sendLoginCode(
  email: string,
  code: string,
  log: FastifyBaseLogger,
): Promise<void> {
  if (config.isProduction) throw new Error('No mail provider is configured (lib/mailer.ts).')
  log.warn({ email, code }, 'DEV ONLY: sign-in code (no mail service is configured)')
}
