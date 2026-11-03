import 'dotenv/config'
import { z } from 'zod'

const PLACEHOLDER_SECRET = 'replace-with-a-long-random-string'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      ),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    /** Keys the hash of email sign-in codes. Keep it secret and stable. */
    AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters'),
    /**
     * DEVELOPMENT ONLY. There is no mail service yet, so the sign-in code is printed to the
     * server log; with this on it is also returned as `mockVerificationCode`, which the
     * frontend's sign-in screen can show. Refused in production.
     */
    AUTH_DEV_RETURN_CODE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== 'production') return
    if (env.AUTH_DEV_RETURN_CODE) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_DEV_RETURN_CODE'],
        message: 'Must be false in production: it would hand the sign-in code to the requester.',
      })
    }
    if (env.AUTH_SECRET === PLACEHOLDER_SECRET) {
      context.addIssue({
        code: 'custom',
        path: ['AUTH_SECRET'],
        message: 'Set a real secret in production.',
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration:')
  console.error(z.prettifyError(parsed.error))
  process.exit(1)
}

export const config = {
  isProduction: parsed.data.NODE_ENV === 'production',
  port: parsed.data.PORT,
  corsOrigins: parsed.data.CORS_ORIGINS,
  databaseUrl: parsed.data.DATABASE_URL,
  authSecret: parsed.data.AUTH_SECRET,
  devReturnCode: parsed.data.AUTH_DEV_RETURN_CODE,
  sessionTtlMs: parsed.data.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
}
