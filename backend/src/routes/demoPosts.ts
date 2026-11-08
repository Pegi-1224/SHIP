/**
 * Demo discussion endpoints, matching frontend/src/mocks/handlers/demoSearch.ts:
 *
 *   GET  /demo/posts?q=&tag=&limit=     published posts, best match first (limit: default 20, max 100)
 *   GET  /demo/posts/:postId            one published post
 *   GET  /demo/posts/:postId/comments   its published comments, newest first
 *   GET  /demo/tags/trending?limit=     the tags on the most published posts (default 3)
 *
 *   POST /demo/posts                    publish a post            (signed in)
 *   PUT  /demo/posts/:postId            edit your own post        (signed in)
 *   POST /demo/posts/:postId/comments   add a comment             (signed in)
 *   GET  /demo/for-you?offset=&limit=   Home feed from the user's assessment topics (signed in)
 *
 * The reads are public so the signed-out Home page works. They are a transition: the
 * authenticated /discussions/* endpoints replace them once the frontend moves over.
 *
 * Every author is shown as "Anonymous" with no picture (spec 3.7); posts and comments carry the
 * writer's anonymous handle, never their account.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import type { Comment, Post } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { COMMENT_MAX } from '../lib/constants.js'
import { forbidden, notFound, validationError } from '../lib/errors.js'
import { DEFAULT_RESULT_LIMIT, rank, scorePost } from '../lib/search.js'
import { validateDemoPost } from '../shared/utils/demoPosts.js'
import type { CommentPreview, PostAuthor, PostPreview } from '../types/demo.js'

const NOT_FOUND_MESSAGE = 'We could not find that discussion.'
/** Highest `limit` a post list may ask for, so the Discussions feed can show every post. */
const MAX_POST_LIMIT = 100
const FOR_YOU_LIMIT = 5
const MAX_FOR_YOU_LIMIT = 20
const TRENDING_LIMIT = 3

const listQuery = z.object({
  q: z.string().trim().default(''),
  tag: z
    .string()
    .trim()
    .default('')
    .transform((tag) => tag.toLowerCase().replace(/^#/, '')),
  limit: z.coerce.number().default(DEFAULT_RESULT_LIMIT).catch(DEFAULT_RESULT_LIMIT),
})
const forYouQuery = z.object({
  offset: z.coerce.number().int().min(0).default(0).catch(0),
  limit: z.coerce.number().int().min(1).default(FOR_YOU_LIMIT).catch(FOR_YOU_LIMIT),
})
const trendingQuery = z.object({
  limit: z.coerce.number().int().min(1).default(TRENDING_LIMIT).catch(TRENDING_LIMIT),
})
const postParams = z.object({ postId: z.string() })

type AuthorMap = Map<string, PostAuthor>

/**
 * The public face of each handle: always "Anonymous" and no picture. Seeded demo authors add
 * an industry and city ("Tech · Seattle"); a real account shows nothing more.
 */
async function loadAuthors(refIds: string[]): Promise<AuthorMap> {
  const authors = await prisma.author.findMany({ where: { refId: { in: [...new Set(refIds)] } } })
  const map: AuthorMap = new Map()
  for (const author of authors) {
    map.set(author.refId, {
      refId: author.refId,
      displayName: 'Anonymous',
      avatarUrl: null,
      industry: author.industry,
      location: author.location,
    })
  }
  return map
}

function authorFor(refId: string, authors: AuthorMap): PostAuthor {
  return (
    authors.get(refId) ?? {
      refId,
      displayName: 'Anonymous',
      avatarUrl: null,
      industry: null,
      location: null,
    }
  )
}

function toPreview(
  post: Post & { _count: { comments: number } },
  authors: AuthorMap,
): PostPreview {
  return {
    id: post.id,
    authorRefId: post.authorRefId,
    title: post.title,
    content: post.content,
    tags: post.tags,
    relatedCompanyIds: post.relatedCompanyIds,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt?.toISOString() ?? null,
    commentCount: post._count.comments,
    status: post.status,
    author: authorFor(post.authorRefId, authors),
  }
}

async function toPreviews(posts: (Post & { _count: { comments: number } })[]) {
  const authors = await loadAuthors(posts.map((post) => post.authorRefId))
  return posts.map((post) => toPreview(post, authors))
}

function toCommentPreview(comment: Comment, authors: AuthorMap): CommentPreview {
  return {
    id: comment.id,
    postId: comment.postId,
    authorRefId: comment.authorRefId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
    status: comment.status,
    author: authorFor(comment.authorRefId, authors),
  }
}

/** Only published comments are counted. */
const withCommentCount = {
  _count: { select: { comments: { where: { status: 'published' as const } } } },
}

/** The post body after the same checks the composer runs; 422 with field errors otherwise. */
function parsePost(body: unknown) {
  const result = validateDemoPost(body)
  if (!result.ok) throw validationError('Please check the highlighted fields.', result.fieldErrors)
  return result.post
}

export async function demoPostRoutes(app: FastifyInstance) {
  app.get('/demo/posts', async (request) => {
    const { q, tag, limit } = listQuery.parse(request.query)
    const posts = await prisma.post.findMany({
      where: { status: 'published', ...(tag ? { tags: { has: tag } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: withCommentCount,
    })
    const result = rank(posts, q, scorePost, Math.min(limit || DEFAULT_RESULT_LIMIT, MAX_POST_LIMIT))
    const authors = await loadAuthors(result.items.map((hit) => hit.item.authorRefId))
    return {
      ...result,
      items: result.items.map((hit) => ({ ...hit, item: toPreview(hit.item, authors) })),
    }
  })

  /** Publish a post as the signed-in user, under their anonymous handle. */
  app.post('/demo/posts', { preHandler: requireAuth }, async (request, reply) => {
    const user = currentUser(request)
    const input = parsePost(request.body)
    const post = await prisma.post.create({
      data: {
        authorRefId: user.anonymousId,
        title: input.title,
        content: input.content,
        tags: input.tags,
        relatedCompanyIds: [],
      },
      include: withCommentCount,
    })
    const [preview] = await toPreviews([post])
    return reply.status(201).send({ post: preview, savedToFile: true })
  })

  /** Edit your own post. Someone else's is 403; the post keeps its id, date and comments. */
  app.put('/demo/posts/:postId', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const { postId } = postParams.parse(request.params)
    const current = await prisma.post.findFirst({ where: { id: postId, status: 'published' } })
    if (!current) throw notFound(NOT_FOUND_MESSAGE)
    if (current.authorRefId !== user.anonymousId) throw forbidden('You can only edit your own posts.')

    const input = parsePost(request.body)
    const post = await prisma.post.update({
      where: { id: current.id },
      data: { title: input.title, content: input.content, tags: input.tags, updatedAt: new Date() },
      include: withCommentCount,
    })
    const [preview] = await toPreviews([post])
    return { post: preview, savedToFile: true }
  })

  /**
   * Home's "For you": posts tagged with the user's assessment topics, newest first, `limit` at a
   * time from `offset` (wrapping round, so Refresh always shows something). With no assessment,
   * or nothing tagged with their topics, it is simply the newest posts.
   */
  app.get('/demo/for-you', { preHandler: requireAuth }, async (request) => {
    const user = currentUser(request)
    const { offset, limit } = forYouQuery.parse(request.query)

    const assessment = await prisma.assessment.findUnique({ where: { userId: user.id } })
    const answers = assessment?.answers as { topics?: unknown } | undefined
    const topics = Array.isArray(answers?.topics)
      ? answers.topics.filter((topic): topic is string => typeof topic === 'string')
      : []

    const published = await prisma.post.findMany({
      where: { status: 'published' },
      orderBy: { createdAt: 'desc' },
      include: withCommentCount,
    })
    const matching = published.filter((post) => post.tags.some((tag) => topics.includes(tag)))
    const pool = matching.length > 0 ? matching : published

    const start = pool.length > 0 ? offset % pool.length : 0
    const page = pool.slice(start, start + Math.min(limit, MAX_FOR_YOU_LIMIT))
    return {
      items: await toPreviews(page),
      offset: start,
      total: pool.length,
      matchedTopics: matching.length > 0,
    }
  })

  app.get('/demo/tags/trending', async (request) => {
    const { limit } = trendingQuery.parse(request.query)
    const posts = await prisma.post.findMany({
      where: { status: 'published' },
      select: { tags: true },
    })
    const counts = new Map<string, number>()
    for (const post of posts) {
      for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    const items = [...counts.entries()]
      .map(([tag, postCount]) => ({ tag, postCount }))
      .sort((a, b) => b.postCount - a.postCount || a.tag.localeCompare(b.tag))
      .slice(0, limit)
    return { items }
  })

  app.get('/demo/posts/:postId', async (request) => {
    const { postId } = postParams.parse(request.params)
    const post = await prisma.post.findFirst({
      where: { id: postId, status: 'published' },
      include: withCommentCount,
    })
    if (!post) throw notFound(NOT_FOUND_MESSAGE)
    return toPreview(post, await loadAuthors([post.authorRefId]))
  })

  app.get('/demo/posts/:postId/comments', async (request) => {
    const { postId } = postParams.parse(request.params)
    const post = await prisma.post.findFirst({ where: { id: postId, status: 'published' } })
    if (!post) throw notFound(NOT_FOUND_MESSAGE)

    const comments = await prisma.comment.findMany({
      where: { postId: post.id, status: 'published' },
      orderBy: { createdAt: 'desc' },
    })
    const authors = await loadAuthors(comments.map((comment) => comment.authorRefId))
    const items = comments.map((comment) => toCommentPreview(comment, authors))
    return { items, total: items.length }
  })

  /** Add a comment as the signed-in user. It carries their anonymous handle, never their account. */
  app.post(
    '/demo/posts/:postId/comments',
    { preHandler: requireAuth },
    async (request, reply) => {
      const { postId } = postParams.parse(request.params)
      const user = currentUser(request)
      const post = await prisma.post.findFirst({ where: { id: postId, status: 'published' } })
      if (!post) throw notFound(NOT_FOUND_MESSAGE)

      const body = z.object({ content: z.unknown() }).safeParse(request.body)
      const content = body.success && typeof body.data.content === 'string' ? body.data.content.trim() : ''
      if (!content || content.length > COMMENT_MAX) {
        const message = content
          ? `Keep comments under ${COMMENT_MAX} characters.`
          : 'Write something first.'
        throw validationError('Please check your comment.', { content: [message] })
      }

      const comment = await prisma.comment.create({
        data: { postId: post.id, authorRefId: user.anonymousId, content },
      })
      const authors = await loadAuthors([comment.authorRefId])
      return reply.status(201).send(toCommentPreview(comment, authors))
    },
  )
}
