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
import type { PostRecord, SearchHit } from '@/shared/types/demoSearch';

export function fetchPosts(
  params: PostListParams,
  signal?: AbortSignal,
): Promise<Paginated<Post>> {
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

export function fetchComments(
  postId: string,
  signal?: AbortSignal,
): Promise<Paginated<Comment>> {
  return api.get<Paginated<Comment>>(
    `/discussions/posts/${encodeURIComponent(postId)}/comments`,
    { signal },
  );
}

export function createComment(postId: string, input: CreateCommentInput): Promise<Comment> {
  return api.post<Comment>(
    `/discussions/posts/${encodeURIComponent(postId)}/comments`,
    input,
  );
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

/** Demo discussion search over `src/mocks/data/posts.json`. */
export function searchDemoPosts(
  q: string,
  signal?: AbortSignal,
): Promise<{ items: SearchHit<PostRecord>[]; total: number }> {
  return api.get('/demo/posts', { query: { q }, auth: false, signal });
}
