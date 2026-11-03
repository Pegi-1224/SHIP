/**
 * Home recommendations (spec 3.8, 6.1, AC-1).
 *
 * HOW ASSESSMENT ANSWERS BECOME TAGS: question 4 already asks for topic tags, so they are used
 * directly. Question 3 asks what matters when choosing a company, which is not a tag, so each
 * priority maps onto the discussion tags that cover it (`PRIORITY_TAGS`). This mapping is a
 * product decision recorded as DQ-05 in the frontend docs; it lives here so it can be tuned
 * without a frontend release.
 *
 * WHAT COUNTS AS "READ": a post is read once the user opens its detail page, which calls
 * `POST /me/read-posts`. Read posts are left out, so a refresh surfaces something new until the
 * matching posts run out - and then `unseenRemaining` says so honestly.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import type { Prisma } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { PRIORITIES } from '../lib/constants.js'
import { parseOrThrow } from '../lib/errors.js'
import { toPosts, withCommentCount } from '../lib/postView.js'

const RECOMMENDATION_LIMIT = 10

const PRIORITY_TAGS: Record<(typeof PRIORITIES)[number], string[]> = {
  pay_equity: ['pay gap', 'negotiation'],
  promotion_and_leadership: ['career goals'],
  supportive_manager: ['supportive manager'],
  parental_leave: ['maternity leave', 'return to work'],
  benefits: ['benefits'],
  work_life_balance: ['work life balance'],
  safe_workplace: ['harassment support'],
}

const answersSchema = z.object({
  priorities: z.array(z.string()).default([]),
  topics: z.array(z.string()).default([]),
})

const readBody = z.object({ postId: z.string().optional() })

function recommendationTags(answers: unknown): string[] {
  const parsed = answersSchema.safeParse(answers)
  if (!parsed.success) return []
  const fromPriorities = parsed.data.priorities.flatMap(
    (priority) => PRIORITY_TAGS[priority as keyof typeof PRIORITY_TAGS] ?? [],
  )
  return [...new Set([...parsed.data.topics, ...fromPriorities])]
}

export async function homeRoutes(app: FastifyInstance) {
  app.get('/home/recommendations', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const assessment = await prisma.assessment.findUnique({ where: { userId: user.id } })
    const tags = recommendationTags(assessment?.answers)

    const matching: Prisma.PostWhereInput = { status: 'published', tags: { hasSome: tags } }
    const unseen: Prisma.PostWhereInput = {
      ...matching,
      reads: { none: { userId: user.id } },
    }

    const [items, totalMatching, unseenRemaining] = await Promise.all([
      prisma.post.findMany({
        where: unseen,
        orderBy: { createdAt: 'desc' },
        take: RECOMMENDATION_LIMIT,
        include: withCommentCount,
      }),
      prisma.post.count({ where: matching }),
      prisma.post.count({ where: unseen }),
    ])

    return {
      items: await toPosts(items, user.anonymousId),
      basedOnTags: tags,
      totalMatching,
      unseenRemaining,
    }
  })

  /** Marks a post as read. Called when its detail page opens. */
  app.post('/me/read-posts', { preHandler: requireAuth }, async (request, reply) => {
    const { postId } = parseOrThrow(readBody, request.body)
    if (postId) {
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } })
      if (post) {
        await prisma.readPost.upsert({
          where: { userId_postId: { userId: currentUser(request).id, postId } },
          create: { userId: currentUser(request).id, postId },
          update: {},
        })
      }
    }
    return reply.status(204).send()
  })

  /** Clears read history. A demo affordance - the contract asks whether it should exist at launch. */
  app.delete('/me/read-posts', { preHandler: requireAuth }, async (request, reply) => {
    await prisma.readPost.deleteMany({ where: { userId: currentUser(request).id } })
    return reply.status(204).send()
  })
}
