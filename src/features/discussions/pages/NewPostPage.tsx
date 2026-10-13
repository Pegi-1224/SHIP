import { useNavigate } from 'react-router-dom';
import { Stack } from '@mantine/core';
import { paths } from '@/shared/config/paths';
import { PageHeader, notifySuccess } from '@/shared/ui';
import { PostForm } from '../components/PostForm';
import { useCreatePost } from '../hooks/useDiscussions';
import type { PostFormValues } from '../schemas/postSchema';

/**
 * Write a new post (spec 3.4).
 *
 * The page keeps the form mounted through a failure so nothing the user wrote
 * is lost - which is why the error is passed into `PostForm` rather than
 * replacing the page with an `ErrorState` (AC-10).
 */
export function NewPostPage() {
  const navigate = useNavigate();
  const createPost = useCreatePost();

  const handleSubmit = (values: PostFormValues) => {
    createPost.mutate(values, {
      onSuccess: (post) => {
        notifySuccess('Your post is live.');
        navigate(paths.discussionDetail(post.id));
      },
    });
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="New post"
        description="Add at least one tag so the people who care about this topic can find it."
      />

      <PostForm
        submitLabel="Publish"
        isPending={createPost.isPending}
        error={createPost.error}
        onSubmit={handleSubmit}
        onCancel={() => navigate(paths.discussions())}
      />
    </Stack>
  );
}
