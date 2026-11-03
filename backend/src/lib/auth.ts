/**
 * Sessions and the request guard.
 *
 * A session is an opaque random token. The client keeps the token and sends it as
 * `Authorization: Bearer <token>`; the database keeps only its SHA-256, so a leaked database
 * cannot be used to sign in and deleting a row signs that browser out immediately.
 *
 * Moving to an httpOnly cookie later means changing `readToken` and the two places that issue
 * and clear it - see frontend/docs/backend-integration.md section 2.1. A cookie would also need
 * CSRF protection on state-changing requests, which a Bearer header does not.
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { config } from '../config.js'
import { prisma } from '../db/client.js'
import type { User } from '../generated/prisma/client.js'
import { unauthorized } from './errors.js'

export type AuthedUser = User & { assessment: { userId: string } | null }

declare module 'fastify' {
  interface FastifyRequest {
    /** Set by `requireAuth` / `optionalAuth`. */
    user: AuthedUser | null
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function newSessionToken(): string {
  return `token_${randomBytes(32).toString('base64url')}`
}

/** Store a session for `userId` and return the token to hand to the client (once). */
export async function createSession(userId: string): Promise<string> {
  const token = newSessionToken()
  await prisma.session.create({
    data: {
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + config.sessionTtlMs),
    },
  })
  return token
}

export function readToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

export async function endSession(request: FastifyRequest): Promise<void> {
  const token = readToken(request)
  if (token) await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } })
}

async function findUser(request: FastifyRequest): Promise<AuthedUser | null> {
  const token = readToken(request)
  if (!token) return null
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: { include: { assessment: { select: { userId: true } } } } },
  })
  if (!session) return null
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return session.user
}

/** `preHandler` for endpoints that need a signed-in user. Answers 401 otherwise. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const user = await findUser(request)
  if (!user) throw unauthorized('No active session.')
  request.user = user
}

/** The signed-in user. Only call in a route that has `requireAuth` as its preHandler. */
export function currentUser(request: FastifyRequest): AuthedUser {
  if (!request.user) throw unauthorized('No active session.')
  return request.user
}

/* -------------------------------------------------------------------------- */
/* Email sign-in codes                                                        */
/* -------------------------------------------------------------------------- */

/** Keyed hash, so a leaked table of 6-digit codes cannot simply be reversed. */
export function hashCode(email: string, code: string): string {
  return createHmac('sha256', config.authSecret).update(`${email}:${code}`).digest('hex')
}

export function codesMatch(expectedHash: string, email: string, code: string): boolean {
  const expected = Buffer.from(expectedHash, 'hex')
  const actual = Buffer.from(hashCode(email, code), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}
