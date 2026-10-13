import { useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Edit an existing post (`/discussions/:postId/edit`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/discussions/components/PostForm.tsx` - shared with
 *     "new post", pre-filled from the existing post here
 *   - `src/features/discussions/hooks/useDiscussions.ts` - `usePost`,
 *     `useUpdatePost`
 *
 * The real page should confirm `post.isOwn` before rendering the form -
 * ownership is also enforced server-side, but the UI should not let someone
 * start editing a post that is not theirs.
 */
export function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();

  return (
    <StarterPage
      title="Edit Post"
      description="This page will provide a form for editing an existing discussion post."
      sourceFile="src/features/discussions/pages/EditPostPage.tsx"
      routeValues={{ postId }}
    >
      <RelatedLinks
        links={[{ to: paths.discussionDetail(postId ?? ''), label: 'Back to this post' }]}
      />
    </StarterPage>
  );
}
