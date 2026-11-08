import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { paths } from '@/shared/config/paths';
import { BackLink, EmptyState, notifySuccess, QueryStateView } from '@/shared/ui';
import { PostComposer } from '../components/PostComposer';
import { useDemoPost, useUpdateDemoPost } from '../hooks/useDiscussions';

/**
 * Edit an existing post (`/discussions/:postId/edit`), pre-filled from the post.
 *
 * Only the author sees the form. Ownership is also enforced by the mock API
 * (`PUT /demo/posts/:id`), because hiding a form is a courtesy, not a control.
 */
export function EditPostPage() {
  const { postId = '' } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const post = useDemoPost(postId);
  const updatePost = useUpdateDemoPost(postId);

  return (
    <QueryStateView query={post} loadingLabel="Loading discussion…">
      {(data) =>
        user?.anonymousIdentity.id === data.authorRefId ? (
          <PostComposer
            heading="Edit your discussion"
            initialValues={{ title: data.title, content: data.content, tags: data.tags }}
            submitLabel="Save"
            isPending={updatePost.isPending}
            error={updatePost.error}
            onCancel={() => navigate(paths.discussionDetail(postId))}
            onSubmit={(input) =>
              updatePost.mutate(input, {
                onSuccess: ({ savedToFile }) => {
                  notifySuccess(
                    savedToFile
                      ? 'Your changes were saved to the demo data.'
                      : 'Your changes were kept for this session.',
                    'Post updated',
                  );
                  navigate(paths.discussionDetail(postId));
                },
              })
            }
          />
        ) : (
          <>
            <BackLink fallback={paths.discussionDetail(postId)} />
            <EmptyState
              title="You can only edit your own posts"
              description={user ? 'This post was written by someone else.' : 'Sign in first.'}
            />
          </>
        )
      }
    </QueryStateView>
  );
}
