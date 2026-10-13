import { useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * A post and its comments (`/discussions/:postId`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/discussions/components/CommentSection.tsx` - comment
 *     list, composer and delete confirmation, already wired to
 *     `useComments` / `useCreateComment` / `useDeleteComment`
 *   - `src/shared/ui` - `AnonymousAvatar`, `TagPill`, `ConfirmDialog`
 *   - `src/features/discussions/hooks/useDiscussions.ts` - `usePost`,
 *     `useDeletePost`, `useMarkPostRead`
 *   - `src/features/messages` - `useStartConversationFlow`
 */
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();

  return (
    <StarterPage
      title="Post Detail"
      description="This page will show a single discussion post and its comments."
      sourceFile="src/features/discussions/pages/PostDetailPage.tsx"
      routeValues={{ postId }}
    >
      <RelatedLinks
        links={[
          { to: paths.discussionEdit(postId ?? ''), label: 'Edit this post' },
          { to: paths.discussions(), label: 'Back to discussions' },
        ]}
      />
    </StarterPage>
  );
}
