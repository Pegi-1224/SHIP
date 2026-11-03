/**
 * Anonymous direct messages (spec 3.7, 6.7; api-contract.md "Messages").
 *
 * IDENTITY: only an anonymous identity is ever returned - no name, email or user id. The client
 * sends the author's anonymous handle to start a conversation and the server resolves it to an
 * account, so the browser never learns who it is talking to.
 *
 * IDEMPOTENT SENDS: every send carries a `clientMessageId` the client generates once and reuses on
 * every retry. If a message with that key already exists for the sender, the stored one is
 * returned (200) instead of a second copy (201), so retrying after an ambiguous failure is safe.
 *
 * REAL-TIME: there is none. The client polls `GET /messages/conversations/:id`. Choosing a push
 * transport is an open question in the contract.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import type { Message, User } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { MESSAGE_MAX } from '../lib/constants.js'
import { conflict, notFound, parseOrThrow, validationError } from '../lib/errors.js'
import type { AnonymousIdentity } from '../lib/identity.js'

/** The most recent messages one thread request returns. The contract has no paging for threads. */
const THREAD_LIMIT = 1000
const NO_SUCH_CONVERSATION = 'That conversation no longer exists.'

const startSchema = z.object({ anonymousId: z.string().trim().min(1, 'Choose someone to message.') })
const sendSchema = z.object({
  body: z
    .string({ error: 'Write a message before sending.' })
    .trim()
    .min(1, 'Write a message before sending.')
    .max(MESSAGE_MAX, `Messages can be up to ${MESSAGE_MAX} characters.`),
  clientMessageId: z
    .string({ error: 'Missing clientMessageId. Retries would create duplicates.' })
    .trim()
    .min(1, 'Missing clientMessageId. Retries would create duplicates.')
    .max(100, 'That clientMessageId is too long.'),
})
const conversationParams = z.object({ conversationId: z.string() })

type PublicUser = Pick<User, 'id' | 'anonymousId' | 'anonymousLabel' | 'anonymousColor'>
const publicUser = { select: { id: true, anonymousId: true, anonymousLabel: true, anonymousColor: true } }

function identityOf(user: PublicUser): AnonymousIdentity {
  return { id: user.anonymousId, label: user.anonymousLabel, color: user.anonymousColor }
}

function messageView(message: Message, viewerId: string) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    body: message.body,
    direction: message.senderId === viewerId ? ('outgoing' as const) : ('incoming' as const),
    createdAt: message.createdAt.toISOString(),
    // Only the sender's own key is ever shown back to them.
    clientMessageId: message.senderId === viewerId ? message.clientMessageId : null,
  }
}

type ConversationRow = {
  id: string
  userAId: string
  userA: PublicUser
  userB: PublicUser
  messages: Message[]
  _count: { messages: number }
}

/** Includes everything `conversationView` needs: the peer, the last message, the unread count. */
const conversationInclude = (viewerId: string) => ({
  userA: publicUser,
  userB: publicUser,
  messages: { orderBy: { createdAt: 'desc' as const }, take: 1 },
  _count: { select: { messages: { where: { senderId: { not: viewerId }, readAt: null } } } },
})

function conversationView(row: ConversationRow, viewerId: string) {
  const peer = row.userAId === viewerId ? row.userB : row.userA
  const last = row.messages[0]
  return {
    id: row.id,
    peer: identityOf(peer),
    lastMessagePreview: last?.body ?? null,
    lastMessageAt: last?.createdAt.toISOString() ?? null,
    unreadCount: row._count.messages,
  }
}

/** The conversation, only if `viewerId` is one of its two participants. */
async function participantConversation(conversationId: string, viewerId: string) {
  const row = await prisma.conversation.findFirst({
    where: { id: conversationId, OR: [{ userAId: viewerId }, { userBId: viewerId }] },
    include: conversationInclude(viewerId),
  })
  // "Not yours" and "does not exist" are deliberately indistinguishable.
  if (!row) throw notFound(NO_SUCH_CONVERSATION)
  return row
}

export async function messageRoutes(app: FastifyInstance) {
  app.get('/messages/conversations', { preHandler: requireAuth }, async (request) => {
    const viewerId = currentUser(request).id
    const rows = await prisma.conversation.findMany({
      where: { OR: [{ userAId: viewerId }, { userBId: viewerId }] },
      include: conversationInclude(viewerId),
    })
    return rows
      .map((row) => conversationView(row, viewerId))
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
  })

  /** Start (or reopen) a conversation from an author's anonymous handle. */
  app.post('/messages/conversations', { preHandler: requireAuth }, async (request, reply) => {
    const { anonymousId } = parseOrThrow(startSchema, request.body, 'Choose someone to message.')
    const viewer = currentUser(request)

    // Resolve the handle back to an account. Seeded demo authors have no account.
    const target = await prisma.user.findUnique({ where: { anonymousId }, select: { id: true } })
    if (!target) throw notFound('That person is no longer available.')
    if (target.id === viewer.id) {
      throw validationError('You cannot start a conversation with yourself.')
    }

    const [userAId, userBId] = viewer.id < target.id ? [viewer.id, target.id] : [target.id, viewer.id]
    const find = () =>
      prisma.conversation.findUnique({
        where: { userAId_userBId: { userAId, userBId } },
        include: conversationInclude(viewer.id),
      })

    const existing = await find()
    if (existing) return conversationView(existing, viewer.id)

    try {
      const created = await prisma.conversation.create({
        data: { userAId, userBId },
        include: conversationInclude(viewer.id),
      })
      return reply.status(201).send(conversationView(created, viewer.id))
    } catch (error) {
      // Both people started it at once: the other request won, so reopen that one.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const raced = await find()
        if (raced) return conversationView(raced, viewer.id)
      }
      throw error
    }
  })

  app.get('/messages/conversations/:conversationId', { preHandler: requireAuth }, async (request) => {
    const { conversationId } = parseOrThrow(conversationParams, request.params)
    const viewerId = currentUser(request).id
    await participantConversation(conversationId, viewerId)

    // Opening the conversation marks the other side's messages as read.
    await prisma.message.updateMany({
      where: { conversationId, senderId: { not: viewerId }, readAt: null },
      data: { readAt: new Date() },
    })

    const [conversation, newest] = await Promise.all([
      participantConversation(conversationId, viewerId),
      prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: THREAD_LIMIT,
      }),
    ])
    return {
      conversation: conversationView(conversation, viewerId),
      messages: newest.reverse().map((message) => messageView(message, viewerId)),
    }
  })

  app.post(
    '/messages/conversations/:conversationId/messages',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { conversationId } = parseOrThrow(conversationParams, request.params)
      const input = parseOrThrow(sendSchema, request.body, 'Write a message before sending.')
      const viewerId = currentUser(request).id
      await participantConversation(conversationId, viewerId)

      const storedKey = { senderId_clientMessageId: { senderId: viewerId, clientMessageId: input.clientMessageId } }
      const alreadyStored = async () => {
        const stored = await prisma.message.findUnique({ where: storedKey })
        if (!stored) return null
        if (stored.conversationId !== conversationId) {
          throw conflict('That clientMessageId was already used for a different conversation.')
        }
        return reply.status(200).send(messageView(stored, viewerId))
      }

      // Idempotency: a retry of an already-stored send returns the same message.
      const replay = await alreadyStored()
      if (replay) return replay

      try {
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: viewerId,
            body: input.body,
            clientMessageId: input.clientMessageId,
          },
        })
        return reply.status(201).send(messageView(message, viewerId))
      } catch (error) {
        // Two attempts with the same key arrived together; the other one stored it.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const raced = await alreadyStored()
          if (raced) return raced
        }
        throw error
      }
    },
  )
}
