import { useNavigate } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { notifySuccess } from '@/shared/ui';
import { PostComposer } from '../components/PostComposer';
import { useCreateDemoPost } from '../hooks/useDiscussions';

/**
 * Write a new post (`/discussions/new`), reached from "+ New post" on the feed.
 *
 * Posts go to `POST /demo/posts`, which adds them to the demo data and, under
 * `npm run dev`, to `src/mocks/data/posts.json`. Then it opens the new post.
 */
export function NewPostPage() {
  const navigate = useNavigate();
  const createPost = useCreateDemoPost();

  return (
    <PostComposer
      heading="Start a discussion"
      submitLabel="Post"
      isPending={createPost.isPending}
      error={createPost.error}
      onCancel={() => navigate(paths.discussions())}
      onSubmit={(input) =>
        createPost.mutate(input, {
          onSuccess: ({ post, savedToFile }) => {
            notifySuccess(
              savedToFile
                ? 'Your post was saved to the demo data.'
                : 'Your post was added for this session.',
              'Post published',
            );
            navigate(paths.discussionDetail(post.id));
          },
        })
      }
    />
  );
}
