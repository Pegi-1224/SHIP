/**
 * Discussion queries and mutations.
 *
 * Mutations invalidate the feed and the home recommendations, because a new or
 * deleted post changes both.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import type {
  CreateCommentInput,
  CreatePostInput,
  PostListParams,
  UpdatePostInput,
} from '@/shared/types/discussion';
import {
  createComment,
  createPost,
  createTag,
  deleteComment,
  deletePost,
  fetchComments,
  fetchPost,
  fetchPosts,
  fetchPublicPreview,
  fetchTags,
  markPostRead,
  searchDemoPosts,
  updatePost,
} from '../api/discussionsApi';

/** Live demo search; `keepPreviousData` stops the list flashing empty between keystrokes. */
export function useDemoPostSearch(q: string) {
  return useQuery({
    queryKey: queryKeys.demoSearch.posts(q),
    queryFn: ({ signal }) => searchDemoPosts(q, signal),
    placeholderData: keepPreviousData,
  });
}

export function usePosts(params: PostListParams) {
  return useQuery({
    queryKey: queryKeys.discussions.posts(params),
    queryFn: ({ signal }) => fetchPosts(params, signal),
  });
}

/** Signed-out preview. Deliberately does not send credentials. */
export function usePublicPreview(enabled = true) {
  return useQuery({
    queryKey: queryKeys.home.publicPreview,
    queryFn: ({ signal }) => fetchPublicPreview(signal),
    enabled,
  });
}

export function usePost(postId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.post(postId ?? ''),
    queryFn: ({ signal }) => fetchPost(postId as string, signal),
    enabled: Boolean(postId),
  });
}

export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.discussions.comments(postId ?? ''),
    queryFn: ({ signal }) => fetchComments(postId as string, signal),
    enabled: Boolean(postId),
  });
}

export function useTagSearch(search: string) {
  return useQuery({
    queryKey: queryKeys.discussions.tags(search),
    queryFn: ({ signal }) => fetchTags(search, signal),
    staleTime: 30_000,
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreatePostInput) => createPost(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
      ]);
    },
  });
}

export function useUpdatePost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdatePostInput) => updatePost(postId, input),
    onSuccess: async (post) => {
      queryClient.setQueryData(queryKeys.discussions.post(postId), post);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
      ]);
    },
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => deletePost(postId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.home.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
      ]);
    },
  });
}

export function useCreateComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(postId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.comments(postId) }),
        // The post's comment count changed too.
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.post(postId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
      ]);
    },
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (commentId: string) => deleteComment(commentId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.comments(postId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.discussions.post(postId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.profile.all }),
      ]);
    },
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => createTag(name),
    onSuccess: () =>
      queryClient.invalidateQueries({
        predicate: (query) =>
          query.queryKey[0] === 'discussions' && query.queryKey[1] === 'tags',
      }),
  });
}

/**
 * Marks a post read when its detail page opens (spec 6.1).
 *
 * Failures are ignored on purpose: read tracking is a recommendation nicety,
 * and a toast about it would interrupt someone who is trying to read a post.
 */
export function useMarkPostRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => markPostRead(postId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.home.recommendations }),
  });
}
