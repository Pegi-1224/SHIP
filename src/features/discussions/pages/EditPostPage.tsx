import { useNavigate, useParams } from 'react-router-dom';
import { Stack } from '@mantine/core';
import { paths } from '@/shared/config/paths';
import { ErrorState, LoadingState, PageHeader, notifySuccess } from '@/shared/ui';
import { PostForm } from '../components/PostForm';
import { usePost, useUpdatePost } from '../hooks/useDiscussions';
import type { PostFormValues } from '../schemas/postSchema';

/**
 * Edit an existing post (spec 6.7).
 *
 * Only the author sees the entry point to this page, and the server rejects an
 * edit from anyone else - the hidden control is a convenience, the server check
 * is the rule. Saving marks the post as edited, which the UI then shows.
 */
export function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const post = usePost(postId);
  const updatePost = useUpdatePost(postId ?? '');

  if (post.isPending) return <LoadingState label="Loading your post…" />;

  if (post.isError) {
    return (
      <ErrorState
        error={post.error}
        title="We could not load this post"
        onRetry={() => void post.refetch()}
        isRetrying={post.isFetching}
      />
    );
  }

  if (!post.data.isOwn) {
    return (
      <ErrorState
        title="You cannot edit this post"
        message="Only the person who wrote a post can edit it."
      />
    );
  }

  const handleSubmit = (values: PostFormValues) => {
    updatePost.mutate(values, {
      onSuccess: () => {
        notifySuccess('Your post was updated.');
        navigate(paths.discussionDetail(post.data.id));
      },
    });
  };

  return (
    <Stack gap="lg">
      <PageHeader title="Edit post" description="Your post will be marked as edited." />

      <PostForm
        defaultValues={{
          title: post.data.title,
          body: post.data.body,
          tags: post.data.tags,
        }}
        submitLabel="Save changes"
        isPending={updatePost.isPending}
        error={updatePost.error}
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.discussionDetail(post.data.id))}
      />
    </Stack>
  );
}
