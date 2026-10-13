/** Profile API functions (spec 3.6). */
import { api } from '@/shared/api';
import type { Paginated } from '@/shared/types/common';
import type { Comment, Post } from '@/shared/types/discussion';
import type { ProfileActivity } from '@/shared/types/user';

export function fetchActivity(signal?: AbortSignal): Promise<ProfileActivity> {
  return api.get<ProfileActivity>('/me/activity', { signal });
}

export function fetchMyPosts(signal?: AbortSignal): Promise<Paginated<Post>> {
  return api.get<Paginated<Post>>('/me/posts', { signal });
}

export function fetchMyComments(signal?: AbortSignal): Promise<Paginated<Comment>> {
  return api.get<Paginated<Comment>>('/me/comments', { signal });
}
