/**
 * Discussions (spec 3.4, 6.4, 6.7, AC-2, AC-3, AC-8; api-contract.md "Discussions").
 *
 * Ownership is enforced here on every edit and delete: the frontend hides controls the user may
 * not use, but that is a courtesy, not a control.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import { Prisma } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import {
  COMMENT_MAX,
  MIN_TAGS_PER_POST,
  POST_BODY_MAX,
  POST_TITLE_MAX,
  PUBLIC_PREVIEW_POSTS_PER_TAG,
  PUBLIC_PREVIEW_TAG_GROUPS,
} from '../lib/constants.js'
import { forbidden, notFound, parseOrThrow, validationError } from '../lib/errors.js'
import { pageWindow, paginationQuerySchema, toPage } from '../lib/pagination.js'
import { toComments, toPost, toPosts, withCommentCount } from '../lib/postView.js'
import { normalizeTag, normalizeTagList, tagProblem } from '../lib/tags.js'

const postBodySchema = z.object({
  title: z
    .string({ error: 'Add a title.' })
    .trim()
    .min(1, 'Add a title so people know what this is about.')
    .max(POST_TITLE_MAX, `Keep the title under ${POST_TITLE_MAX} characters.`),
  body: z
    .string({ error: 'Write something before posting.' })
    .trim()
    .min(1, 'Write something before posting.')
    .max(POST_BODY_MAX, `Posts can be up to ${POST_BODY_MAX} characters.`),
  tags: z
    .array(z.string(), { error: `Add at least ${MIN_TAGS_PER_POST} tag so people can find this.` })
    .transform(normalizeTagList)
    .superRefine((tags, context) => {
      if (tags.length < MIN_TAGS_PER_POST) {
        context.addIssue({
          code: 'custom',
          message: `Add at least ${MIN_TAGS_PER_POST} tag so people can find this.`,
        })
        return
      }
      for (const tag of tags) {
        const problem = tagProblem(tag)
        if (problem) {
          context.addIssue({ code: 'custom', message: problem })
          return
        }
      }
    }),
})

const commentBodySchema = z.object({
  body: z
    .string({ error: 'Write something before posting.' })
    .trim()
    .min(1, 'Write something before posting.')
    .max(COMMENT_MAX, 'That is too long.'),
})

const listQuerySchema = paginationQuerySchema.extend({
  tag: z.string().default('').transform(normalizeTag),
  q: z
    .string()
    .default('')
    .transform((value) => value.trim().replace(/^#/, '').toLowerCase()),
})
const tagSearchSchema = z.object({ q: z.string().default('').transform((value) => value.trim().toLowerCase()) })
const tagBodySchema = z.object({ name: z.string().default('') })
const postParams = z.object({ postId: z.string() })
const commentParams = z.object({ commentId: z.string() })

interface TagCount {
  name: string
  postCount: number
}

/** Every tag with its published-post count, most used first. Includes tags created but unused. */
export async function allTags(): Promise<TagCount[]> {
  const used = await prisma.$queryRaw<TagCount[]>(Prisma.sql`
    SELECT tag AS name, COUNT(*)::int AS "postCount"
    FROM "Post", unnest("tags") AS tag
    WHERE "status" = 'published'
    GROUP BY tag`)
  const counts = new Map(used.map((entry) => [entry.name, entry.postCount]))
  for (const { name } of await prisma.tag.findMany()) {
    if (!counts.has(name)) counts.set(name, 0)
  }
  return [...counts.entries()]
    .map(([name, postCount]) => ({ name, postCount }))
    .sort((a, b) => b.postCount - a.postCount || a.name.localeCompare(b.name))
}

async function findPublishedPost(postId: string) {
  const post = await prisma.post.findFirst({
    where: { id: postId, status: 'published' },
    include: withCommentCount,
  })
  if (!post) throw notFound('That post no longer exists.')
  return post
}

export async function discussionRoutes(app: FastifyInstance) {
  /**
   * The only discussion endpoint a signed-out visitor may call (spec 2.2, AC-3): the most-used
   * tags with at most ten newest posts each. The cap is applied here, not in the client.
   */
  app.get('/discussions/public-preview', async () => {
    const topTags = (await allTags())
      .filter((tag) => tag.postCount > 0)
      .slice(0, PUBLIC_PREVIEW_TAG_GROUPS)

    return Promise.all(
      topTags.map(async (tag) => {
        const posts = await prisma.post.findMany({
          where: { status: 'published', tags: { has: tag.name } },
          orderBy: { createdAt: 'desc' },
          take: PUBLIC_PREVIEW_POSTS_PER_TAG,
          include: withCommentCount,
        })
        return { tag: tag.name, posts: await toPosts(posts, null) }
      }),
    )
  })

  /** Tag search / type-ahead. */
  app.get('/discussions/tags', { preHandler: requireAuth }, async (request) => {
    const { q } = parseOrThrow(tagSearchSchema, request.query)
    const tags = await allTags()
    return (q ? tags.filter((tag) => tag.name.includes(q)) : tags).slice(0, 20)
  })

  /** Create a tag before using it (spec 6.4, AC-8). */
  app.post('/discussions/tags', { preHandler: requireAuth }, async (request, reply) => {
    const { name: raw } = parseOrThrow(tagBodySchema, request.body)
    const problem = tagProblem(raw)
    if (problem) throw validationError(problem, { name: [problem] })

    const name = normalizeTag(raw)
    await prisma.tag.upsert({ where: { name }, create: { name }, update: {} })
    const existing = (await allTags()).find((tag) => tag.name === name)
    return reply.status(201).send({ name, postCount: existing?.postCount ?? 0 })
  })

  /** The feed, newest first, filtered by tag or free text. */
  app.get('/discussions/posts', { preHandler: requireAuth }, async (request) => {
    const query = parseOrThrow(listQuerySchema, request.query)
    const where: Prisma.PostWhereInput = {
      status: 'published',
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: 'insensitive' } },
              { content: { contains: query.q, mode: 'insensitive' } },
              { tags: { has: query.q } },
            ],
          }
        : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageWindow(query),
        include: withCommentCount,
      }),
      prisma.post.count({ where }),
    ])
    return toPage(await toPosts(rows, currentUser(request).anonymousId), total, query)
  })

  app.post('/discussions/posts', { preHandler: requireAuth }, async (request, reply) => {
    const input = parseOrThrow(postBodySchema, request.body)
    const user = currentUser(request)
    const post = await prisma.post.create({
      data: {
        authorRefId: user.anonymousId,
        title: input.title,
        content: input.body,
        tags: input.tags,
      },
      include: withCommentCount,
    })
    return reply.status(201).send(await toPost(post, user.anonymousId))
  })

  app.get('/discussions/posts/:postId', { preHandler: requireAuth }, async (request) => {
    const { postId } = parseOrThrow(postParams, request.params)
    return toPost(await findPublishedPost(postId), currentUser(request).anonymousId)
  })

  app.put('/discussions/posts/:postId', { preHandler: requireAuth }, async (request) => {
    const { postId } = parseOrThrow(postParams, request.params)
    const user = currentUser(request)
    const existing = await findPublishedPost(postId)
    if (existing.authorRefId !== user.anonymousId) throw forbidden('You can only edit your own posts.')

    const input = parseOrThrow(postBodySchema, request.body)
    const post = await prisma.post.update({
      where: { id: postId },
      data: { title: input.title, content: input.body, tags: input.tags, updatedAt: new Date() },
      include: withCommentCount,
    })
    return toPost(post, user.anonymousId)
  })

  /** Deleting a post deletes its comments too (spec 6.7): the relation cascades. */
  app.delete('/discussions/posts/:postId', { preHandler: requireAuth }, async (request, reply) => {
    const { postId } = parseOrThrow(postParams, request.params)
    const existing = await findPublishedPost(postId)
    if (existing.authorRefId !== currentUser(request).anonymousId) {
      throw forbidden('You can only delete your own posts.')
    }
    await prisma.post.delete({ where: { id: postId } })
    return reply.status(204).send()
  })

  /** Comments, oldest first. */
  app.get('/discussions/posts/:postId/comments', { preHandler: requireAuth }, async (request) => {
    const { postId } = parseOrThrow(postParams, request.params)
    const query = parseOrThrow(paginationQuerySchema, request.query)
    await findPublishedPost(postId)

    const where = { postId, status: 'published' as const }
    const [rows, total] = await Promise.all([
      prisma.comment.findMany({ where, orderBy: { createdAt: 'asc' }, ...pageWindow(query) }),
      prisma.comment.count({ where }),
    ])
    return toPage(await toComments(rows, currentUser(request).anonymousId), total, query)
  })

  app.post(
    '/discussions/posts/:postId/comments',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { postId } = parseOrThrow(postParams, request.params)
      const input = parseOrThrow(commentBodySchema, request.body, 'Write something before posting.')
      await findPublishedPost(postId)

      const user = currentUser(request)
      const comment = await prisma.comment.create({
        data: { postId, authorRefId: user.anonymousId, content: input.body },
      })
      const [view] = await toComments([comment], user.anonymousId)
      return reply.status(201).send(view)
    },
  )

  app.delete('/discussions/comments/:commentId', { preHandler: requireAuth }, async (request, reply) => {
    const { commentId } = parseOrThrow(commentParams, request.params)
    const comment = await prisma.comment.findUnique({ where: { id: commentId } })
    if (!comment) throw notFound('That comment no longer exists.')
    if (comment.authorRefId !== currentUser(request).anonymousId) {
      throw forbidden('You can only delete your own comments.')
    }
    await prisma.comment.delete({ where: { id: commentId } })
    return reply.status(204).send()
  })
}
