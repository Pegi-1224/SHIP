/**
 * Authentication (frontend/docs/api-contract.md, "Authentication" and "Account").
 *
 * Email sign-in: request a 6-digit code, then verify it. A new address creates the account, and
 * must confirm eligibility (spec 2.1). No mail service exists yet - see lib/mailer.ts.
 *
 * Not built: POST /auth/google/mock. It signs in a fixed demo account with no OAuth, which a
 * real backend must never do; real Google sign-in is a separate piece of work.
 */
import { randomInt } from 'node:crypto'
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { config } from '../config.js'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import { codesMatch, createSession, currentUser, endSession, hashCode, requireAuth } from '../lib/auth.js'
import type { AuthedUser } from '../lib/auth.js'
import { parseOrThrow, rateLimited, validationError } from '../lib/errors.js'
import { generateIdentity } from '../lib/identity.js'
import { sendLoginCode } from '../lib/mailer.js'

const CODE_TTL_MS = 10 * 60 * 1000
const RESEND_COOLDOWN_SECONDS = 30
const MAX_CODE_ATTEMPTS = 5

const EMAIL_MESSAGE = 'Enter a valid email address.'
const emailSchema = z
  .string({ error: EMAIL_MESSAGE })
  .trim()
  .toLowerCase()
  .pipe(z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, EMAIL_MESSAGE).max(254, EMAIL_MESSAGE))

const requestCodeBody = z.object({ email: emailSchema })
const verifyBody = z.object({
  email: emailSchema,
  code: z.string().trim().default(''),
  confirmsEligibility: z.boolean().optional(),
})

/** What the signed-in user sees about themselves. Email and name are for this user only. */
export function toSessionUser(user: AuthedUser) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    anonymousIdentity: {
      id: user.anonymousId,
      label: user.anonymousLabel,
      color: user.anonymousColor,
    },
    authProvider: user.authProvider,
    createdAt: user.createdAt.toISOString(),
    hasCompletedAssessment: user.assessment !== null,
    hasSeenInstructions: user.hasSeenInstructions,
  }
}

async function createUser(email: string): Promise<AuthedUser> {
  const identity = generateIdentity()
  return prisma.user.create({
    data: {
      email,
      // Visible to this account only (spec 3.6). Never shown to other users.
      displayName: email.split('@')[0] ?? 'You',
      anonymousId: identity.id,
      anonymousLabel: identity.label,
      anonymousColor: identity.color,
      eligibilityConfirmedAt: new Date(),
    },
    include: { assessment: { select: { userId: true } } },
  })
}

export async function authRoutes(app: FastifyInstance) {
  /** Who is signed in. 401 when nobody is; the client treats that as "signed out". */
  app.get('/auth/session', { preHandler: requireAuth }, async (request) =>
    toSessionUser(currentUser(request)),
  )

  /** Step 1: generate a code and "send" it. */
  app.post('/auth/email/request-code', async (request) => {
    const { email } = parseOrThrow(requestCodeBody, request.body, EMAIL_MESSAGE)

    const existing = await prisma.emailCode.findUnique({ where: { email } })
    if (existing) {
      const sinceMs = Date.now() - existing.requestedAt.getTime()
      if (sinceMs < RESEND_COOLDOWN_SECONDS * 1000) {
        const wait = Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - sinceMs) / 1000)
        throw rateLimited(`Please wait ${wait} seconds before requesting another code.`)
      }
    }

    const code = String(randomInt(100000, 1000000))
    const data = {
      codeHash: hashCode(email, code),
      attempts: 0,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    }
    await prisma.emailCode.upsert({ where: { email }, create: { email, ...data }, update: data })
    await sendLoginCode(email, code, request.log)

    return {
      resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
      // DEVELOPMENT ONLY (config refuses this in production). A real mail provider replaces it.
      ...(config.devReturnCode ? { mockVerificationCode: code } : {}),
    }
  })

  /** Step 2: check the code, create the account if the address is new, start a session. */
  app.post('/auth/email/verify', async (request) => {
    const { email, code, confirmsEligibility } = parseOrThrow(verifyBody, request.body)

    const entry = await prisma.emailCode.findUnique({ where: { email } })
    if (!entry) {
      throw validationError('Request a new code first.', { code: ['Request a new code first.'] })
    }
    if (entry.expiresAt.getTime() < Date.now()) {
      throw validationError('That code has expired. Request a new one.', {
        code: ['That code has expired. Request a new one.'],
      })
    }
    if (entry.attempts >= MAX_CODE_ATTEMPTS) {
      await prisma.emailCode.delete({ where: { email } })
      throw rateLimited('Too many incorrect attempts. Request a new code.')
    }
    if (!codesMatch(entry.codeHash, email, code)) {
      await prisma.emailCode.update({ where: { email }, data: { attempts: { increment: 1 } } })
      throw validationError('That code is not correct.', { code: ['That code is not correct.'] })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { assessment: { select: { userId: true } } },
    })

    // New accounts must confirm spec 2.1 eligibility. No identity check runs.
    if (!existingUser && confirmsEligibility !== true) {
      throw validationError(
        'Please confirm you are a woman aged 18 or older to create an account.',
        { confirmsEligibility: ['Please confirm to create your account.'] },
      )
    }

    // A code is single-use: deleting it first means a replay finds nothing.
    const consumed = await prisma.emailCode.deleteMany({ where: { email, codeHash: entry.codeHash } })
    if (consumed.count === 0) {
      throw validationError('Request a new code first.', { code: ['Request a new code first.'] })
    }

    let user = existingUser
    if (!user) {
      try {
        user = await createUser(email)
      } catch (error) {
        // Two simultaneous first sign-ins for one address: the other request won, so use its row.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
          throw error
        }
        user = await prisma.user.findUnique({
          where: { email },
          include: { assessment: { select: { userId: true } } },
        })
        if (!user) throw error
      }
    }

    const token = await createSession(user.id)
    return { user: toSessionUser(user), token, isNewAccount: !existingUser }
  })

  /** Ends this session on the server; clearing the client's copy is not enough. */
  app.post('/auth/sign-out', { preHandler: requireAuth }, async (request, reply) => {
    await endSession(request)
    return reply.status(204).send()
  })

  /** Marks the one-time instruction walkthrough as finished (spec 3.10). */
  app.post('/me/instructions-seen', { preHandler: requireAuth }, async (request, reply) => {
    await prisma.user.update({
      where: { id: currentUser(request).id },
      data: { hasSeenInstructions: true },
    })
    return reply.status(204).send()
  })
}
