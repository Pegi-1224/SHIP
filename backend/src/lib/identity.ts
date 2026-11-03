/**
 * Anonymous identities. Everything public about a person is an opaque handle, a label and a
 * colour - never a user id, name or email (spec 3.7). Ported from the frontend's
 * mocks/fixtures/identities.ts palette so authors look the same as the pages were designed.
 */
import { randomBytes, randomInt } from 'node:crypto'
import { prisma } from '../db/client.js'

export interface AnonymousIdentity {
  /** Opaque handle. The only thing a client can use to start a conversation. */
  id: string
  label: string
  color: string
}

const ANIMALS = [
  'Finch', 'Heron', 'Otter', 'Lynx', 'Marten', 'Osprey', 'Wren', 'Ibis',
  'Sable', 'Puffin', 'Kestrel', 'Tanager', 'Vireo', 'Avocet', 'Plover', 'Shrike',
]

const COLORS = [
  '#7c40b6', '#1c7f8f', '#b3532a', '#2f6b3f', '#8a3d6b', '#3a5ca8', '#8a5a00', '#5a4bb0',
]

/** Stable 32-bit hash, so the same handle always gets the same colour. */
function hash(value: string): number {
  let result = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index)
    result = Math.imul(result, 16777619)
  }
  return Math.abs(result)
}

export function colorFor(handle: string): string {
  return COLORS[(hash(handle) >> 5) % COLORS.length] ?? '#7c40b6'
}

/** A fresh random identity for a new account. */
export function generateIdentity(): AnonymousIdentity {
  const animal = ANIMALS[randomInt(ANIMALS.length)] ?? 'Finch'
  const handle = `anon_${randomBytes(5).toString('hex')}`
  return { id: handle, label: `Anonymous ${animal}`, color: colorFor(handle) }
}

/**
 * Identities for a set of handles in two queries. A handle belongs to a real account
 * (User) or to a seeded demo author (Author); anything else shows as plain "Anonymous".
 */
export async function loadIdentities(handles: string[]): Promise<Map<string, AnonymousIdentity>> {
  const unique = [...new Set(handles)]
  const [users, authors] = await Promise.all([
    prisma.user.findMany({
      where: { anonymousId: { in: unique } },
      select: { anonymousId: true, anonymousLabel: true, anonymousColor: true },
    }),
    prisma.author.findMany({ where: { refId: { in: unique } } }),
  ])

  const result = new Map<string, AnonymousIdentity>()
  for (const author of authors) {
    result.set(author.refId, {
      id: author.refId,
      label: author.displayName ?? 'Anonymous',
      color: colorFor(author.refId),
    })
  }
  for (const user of users) {
    result.set(user.anonymousId, {
      id: user.anonymousId,
      label: user.anonymousLabel,
      color: user.anonymousColor,
    })
  }
  return result
}

export function identityFor(
  identities: Map<string, AnonymousIdentity>,
  handle: string,
): AnonymousIdentity {
  return identities.get(handle) ?? { id: handle, label: 'Anonymous', color: colorFor(handle) }
}
