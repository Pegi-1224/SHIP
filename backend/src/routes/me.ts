/**
 * The signed-in user's own activity, and account deletion (api-contract.md "Account").
 */
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { parseOrThrow } from '../lib/errors.js'
import { pageWindow, paginationQuerySchema, toPage } from '../lib/pagination.js'
import { toComments, toPosts, withCommentCount } from '../lib/postView.js'

/** Company reports written under this handle: "Add this company" answers and "Share your data". */
const reportsBy = (handle: string) => ({ data: { path: ['authorRefId'], equals: handle } })

export async function meRoutes(app: FastifyInstance) {
  /**
   * Counts for Profile. `submissionCount` is the number of different companies the user shared
   * data about, through any route: a formal submission (current ones only - a superseded one is
   * history), "Add this company", or "Share your data" on a company page.
   */
  app.get('/me/activity', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const handle = user.anonymousId
    const [postCount, commentCount, submissions, reports] = await Promise.all([
      prisma.post.count({ where: { authorRefId: handle, status: 'published' } }),
      prisma.comment.count({ where: { authorRefId: handle, status: 'published' } }),
      prisma.submission.findMany({
        where: { userId: user.id, supersededAt: null },
        select: { companyId: true },
      }),
      prisma.companyReport.findMany({ where: reportsBy(handle), select: { companyId: true } }),
    ])
    const companies = new Set([...submissions, ...reports].map((row) => row.companyId))
    return { postCount, commentCount, submissionCount: companies.size }
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
   * own comments elsewhere; their company submissions, including superseded history; the company
   * reports written under their handle (the stored rows - see the note on `userReported` below); their
   * assessment, read history and all sessions; the pending sign-in code; and the account itself.
   * Aggregates are computed from live rows on every read, so removing the submissions recomputes
   * them at once - which can push a metric back below the five-contributor threshold, and it stops
   * being published immediately (spec 6.6, T2).
   *
   * Not yet true of the demo companies: their `userReported` averages are updated as each report
   * arrives and are not rebuilt here, so a deleted user's reports stay in those averages until a
   * recompute-from-reports step exists.
   *
   * Deletion is immediate and keeps no tombstone: the contract lists a grace period and abuse
   * tombstones as open questions.
   */
  app.delete('/me', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    await prisma.$transaction(async (tx) => {
      await tx.post.deleteMany({ where: { authorRefId: user.anonymousId } })
      await tx.comment.deleteMany({ where: { authorRefId: user.anonymousId } })
      await tx.companyReport.deleteMany({ where: reportsBy(user.anonymousId) })
      await tx.emailCode.deleteMany({ where: { email: user.email } })
      // Cascades to Session, Assessment, ReadPost and Submission.
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
