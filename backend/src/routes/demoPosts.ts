/**
 * Demo discussion endpoints, matching frontend/src/mocks/handlers/demoSearch.ts:
 *
 *   GET /demo/posts?q=&tag=&limit=      published posts, best match first (limit: default 20, max 100)
 *   GET /demo/posts/:postId             one published post
 *   GET /demo/posts/:postId/comments    its published comments, newest first
 *
 *   POST /demo/posts/:postId/comments   add a comment (needs a signed-in user)
 *
 * The reads are public so the signed-out Home page works. They are a transition: the
 * authenticated /discussions/* endpoints replace them once the frontend moves over.
 */
import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db/client.js'
import type { Comment, Post } from '../generated/prisma/client.js'
import { currentUser, requireAuth } from '../lib/auth.js'
import { COMMENT_MAX } from '../lib/constants.js'
import { notFound, validationError } from '../lib/errors.js'
import { DEFAULT_RESULT_LIMIT, rank, scorePost } from '../lib/search.js'
import type { CommentPreview, PostAuthor, PostPreview } from '../types/demo.js'

const NOT_FOUND_MESSAGE = 'We could not find that discussion.'
/** Highest `limit` a post list may ask for, so the Discussions feed can show every post. */
const MAX_POST_LIMIT = 100

const listQuery = z.object({
  q: z.string().trim().default(''),
  tag: z
    .string()
    .trim()
    .default('')
    .transform((tag) => tag.toLowerCase().replace(/^#/, '')),
  limit: z.coerce.number().default(DEFAULT_RESULT_LIMIT).catch(DEFAULT_RESULT_LIMIT),
})
const postParams = z.object({ postId: z.string() })

type AuthorMap = Map<string, PostAuthor>

/**
 * The public face of each handle: a seeded demo author (name, avatar, industry), or a real
 * account, which only ever shows its anonymous label.
 */
async function loadAuthors(refIds: string[]): Promise<AuthorMap> {
  const unique = [...new Set(refIds)]
  const [authors, users] = await Promise.all([
    prisma.author.findMany({ where: { refId: { in: unique } } }),
    prisma.user.findMany({
      where: { anonymousId: { in: unique } },
      select: { anonymousId: true, anonymousLabel: true },
    }),
  ])
  const map: AuthorMap = new Map()
  for (const author of authors) {
    map.set(author.refId, {
      refId: author.refId,
      displayName: author.displayName ?? 'Anonymous',
      avatarUrl: author.avatarUrl,
      industry: author.industry,
      location: author.location,
    })
  }
  for (const user of users) {
    map.set(user.anonymousId, {
      refId: user.anonymousId,
      displayName: user.anonymousLabel,
      avatarUrl: null,
      industry: null,
      location: null,
    })
  }
  return map
}

/** Unknown handles show as "Anonymous". */
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
