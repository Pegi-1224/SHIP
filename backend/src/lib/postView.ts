/**
 * Turns post and comment rows into the shapes in api-contract.md. The author is only ever an
 * anonymous identity, and `isOwn` is computed from the viewer's own handle.
 */
import type { Comment, Post } from '../generated/prisma/client.js'
import { identityFor, loadIdentities } from './identity.js'

/** Only published comments are counted. */
export const withCommentCount = {
  _count: { select: { comments: { where: { status: 'published' as const } } } },
}

export type PostWithCount = Post & { _count: { comments: number } }

export async function toPosts(posts: PostWithCount[], viewerHandle: string | null) {
  const identities = await loadIdentities(posts.map((post) => post.authorRefId))
  return posts.map((post) => ({
    id: post.id,
    title: post.title,
    body: post.content,
    tags: post.tags,
    author: identityFor(identities, post.authorRefId),
    isOwn: viewerHandle !== null && post.authorRefId === viewerHandle,
    createdAt: post.createdAt.toISOString(),
    editedAt: post.updatedAt?.toISOString() ?? null,
    commentCount: post._count.comments,
  }))
}

export async function toPost(post: PostWithCount, viewerHandle: string | null) {
  const [view] = await toPosts([post], viewerHandle)
  if (!view) throw new Error('unreachable')
  return view
}

export async function toComments(comments: Comment[], viewerHandle: string | null) {
  const identities = await loadIdentities(comments.map((comment) => comment.authorRefId))
  return comments.map((comment) => ({
    id: comment.id,
    postId: comment.postId,
    body: comment.content,
    author: identityFor(identities, comment.authorRefId),
    isOwn: viewerHandle !== null && comment.authorRefId === viewerHandle,
    createdAt: comment.createdAt.toISOString(),
    // Comments cannot be edited yet (an open question in the contract).
    editedAt: null,
  }))
}
