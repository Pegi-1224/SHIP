/**
 * The signed-in user's own activity, and account deletion (api-contract.md "Account").
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { parseOrThrow } from '../lib/errors.js'
import { pageWindow, paginationQuerySchema, toPage } from '../lib/pagination.js'
import { toComments, toPosts, withCommentCount } from '../lib/postView.js'

export async function meRoutes(app: FastifyInstance) {
  app.get('/me/activity', { preHandler: requireAuth }, async (request) => {
    const handle = currentUser(request).anonymousId
    const [postCount, commentCount, submissionCount] = await Promise.all([
      prisma.post.count({ where: { authorRefId: handle, status: 'published' } }),
      prisma.comment.count({ where: { authorRefId: handle, status: 'published' } }),
      // Current contributions only: a superseded submission is history, not a contribution.
      prisma.submission.count({ where: { userId: currentUser(request).id, supersededAt: null } }),
    ])
    return { postCount, commentCount, submissionCount }
  })

  app.get('/me/posts', { preHandler: requireAuth }, async (request) => {
    const query = parseOrThrow(paginationQuerySchema, request.query)
    const handle = currentUser(request).anonymousId
    const where = { authorRefId: handle, status: 'published' as const }
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageWindow(query),
        include: withCommentCount,
      }),
      prisma.post.count({ where }),
    ])
    return toPage(await toPosts(rows, handle), total, query)
  })

  /**
   * Delete the account and everything that belongs to it (spec 3.9, AC-9), in one transaction.
   * The frontend calls this once; it cannot see other people's comments on its posts, and a
   * partial failure would orphan data.
   *
   * What goes: the user's posts and EVERY comment on them (other people's too, by cascade); their
   * own comments elsewhere; their company submissions, including superseded history; every
   * conversation they took part in, for both people, and its messages; their assessment, read
   * history and all sessions; the pending sign-in code; and the account itself. Aggregates are
   * computed from live rows on every read, so removing the submissions recomputes them at once -
   * which can push a metric back below the five-contributor threshold, and it stops being
   * published immediately (spec 6.6, T2).
   *
   * Deletion is immediate and keeps no tombstone: the contract lists a grace period and abuse
   * tombstones as open questions.
   */
  app.delete('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    await prisma.$transaction(async (tx) => {
      await tx.post.deleteMany({ where: { authorRefId: user.anonymousId } })
      await tx.comment.deleteMany({ where: { authorRefId: user.anonymousId } })
      await tx.emailCode.deleteMany({ where: { email: user.email } })
      // Cascades to Session, Assessment, ReadPost, Submission, Conversation and Message.
      await tx.user.delete({ where: { id: user.id } })
    })
    return reply.status(204).send()
  })

  app.get('/me/comments', { preHandler: requireAuth }, async (request) => {
    const query = parseOrThrow(paginationQuerySchema, request.query)
    const handle = currentUser(request).anonymousId
    const where = { authorRefId: handle, status: 'published' as const }
    const [rows, total] = await Promise.all([
      prisma.comment.findMany({ where, orderBy: { createdAt: 'desc' }, ...pageWindow(query) }),
      prisma.comment.count({ where }),
    ])
    return toPage(await toComments(rows, handle), total, query)
  })
}
