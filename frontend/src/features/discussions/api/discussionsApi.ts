/** Discussion board API functions (spec 3.4, 6.4). */
import { api } from '@/shared/api';
import type { Paginated } from '@/shared/types/common';
import type {
  Comment,
  CreateCommentInput,
  CreatePostInput,
  Post,
  PostListParams,
  PublicTagPreview,
  Tag,
  UpdatePostInput,
} from '@/shared/types/discussion';
import type { CommentPreview, PostPreview, SearchHit } from '@/shared/types/demoSearch';

export function fetchPosts(params: PostListParams, signal?: AbortSignal): Promise<Paginated<Post>> {
  return api.get<Paginated<Post>>('/discussions/posts', {
    query: {
      tag: params.tag,
      q: params.q,
      page: params.page,
      pageSize: params.pageSize,
    },
    signal,
  });
}

/** The limited preview signed-out visitors see on the home page (spec 2.2). */
export function fetchPublicPreview(signal?: AbortSignal): Promise<PublicTagPreview[]> {
  return api.get<PublicTagPreview[]>('/discussions/public-preview', { auth: false, signal });
}

export function fetchPost(postId: string, signal?: AbortSignal): Promise<Post> {
  return api.get<Post>(`/discussions/posts/${encodeURIComponent(postId)}`, { signal });
}

export function createPost(input: CreatePostInput): Promise<Post> {
  return api.post<Post>('/discussions/posts', input);
}

export function updatePost(postId: string, input: UpdatePostInput): Promise<Post> {
  return api.put<Post>(`/discussions/posts/${encodeURIComponent(postId)}`, input);
}

export function deletePost(postId: string): Promise<void> {
  return api.delete<void>(`/discussions/posts/${encodeURIComponent(postId)}`);
}

export function fetchComments(postId: string, signal?: AbortSignal): Promise<Paginated<Comment>> {
  return api.get<Paginated<Comment>>(`/discussions/posts/${encodeURIComponent(postId)}/comments`, {
    signal,
  });
}

export function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  return api.post<Comment>(`/discussions/posts/${encodeURIComponent(postId)}/comments`, input);
}

export function deleteComment(commentId: string): Promise<void> {
  return api.delete<void>(`/discussions/comments/${encodeURIComponent(commentId)}`);
}

export function fetchTags(search: string, signal?: AbortSignal): Promise<Tag[]> {
  return api.get<Tag[]>('/discussions/tags', { query: { q: search }, signal });
}

/** Create a tag up front. The server runs the authoritative word check (AC-8). */
export function createTag(name: string): Promise<Tag> {
  return api.post<Tag>('/discussions/tags', { name });
}

/** Records that the user opened a post, which excludes it from recommendations. */
export function markPostRead(postId: string): Promise<void> {
  return api.post<void>('/me/read-posts', { postId });
}

export interface DemoPostFeedParams {
  q?: string;
  tag?: string;
  limit?: number;
}

/** The Discussions feed: newest first, or best match first while searching. */
export function fetchDemoPostFeed(
  { q, tag, limit }: DemoPostFeedParams,
  signal?: AbortSignal,
): Promise<{ items: SearchHit<PostPreview>[]; total: number }> {
  return api.get('/demo/posts', { query: { q, tag, limit }, auth: false, signal });
}

/** The newest `limit` published demo posts carrying `tag`. Public, so it works on Home. */
export function fetchLatestDemoPostsByTag(
  tag: string,
  limit: number,
  signal?: AbortSignal,
): Promise<{ items: SearchHit<PostPreview>[]; total: number }> {
  return api.get('/demo/posts', { query: { tag, limit }, auth: false, signal });
}

/** One published demo post with its author, for the discussion page. */
export function fetchDemoPost(postId: string, signal?: AbortSignal): Promise<PostPreview> {
  return api.get(`/demo/posts/${encodeURIComponent(postId)}`, { auth: false, signal });
}

/** A demo post's comments, newest first. */
export function fetchDemoComments(
  postId: string,
  signal?: AbortSignal,
): Promise<{ items: CommentPreview[]; total: number }> {
  return api.get(`/demo/posts/${encodeURIComponent(postId)}/comments`, { auth: false, signal });
}

/** Adds a comment as the signed-in user. */
export function createDemoComment(postId: string, content: string): Promise<CommentPreview> {
  return api.post(`/demo/posts/${encodeURIComponent(postId)}/comments`, { content });
}
