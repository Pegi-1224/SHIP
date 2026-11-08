import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import { fetchActivity, fetchMyComments, fetchMyPosts } from '../api/profileApi';

export function useProfileActivity() {
  return useQuery({
    queryKey: queryKeys.profile.activity,
    queryFn: ({ signal }) => fetchActivity(signal),
  });
}

export function useMyPosts(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile.posts,
    queryFn: ({ signal }) => fetchMyPosts(signal),
    enabled,
  });
}

export function useMyComments(enabled = true) {
  return useQuery({
    queryKey: queryKeys.profile.comments,
    queryFn: ({ signal }) => fetchMyComments(signal),
    enabled,
  });
}
