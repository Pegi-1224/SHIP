import { useSearchParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * The discussion feed (`/discussions`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/shared/ui` - `PostCard`, `TagPill`
 *   - `src/features/discussions/hooks/useDiscussions.ts` - `usePosts`,
 *     `useTagSearch`
 *   - `src/features/messages` - `useStartConversationFlow` (message a post's
 *     author from their anonymous avatar)
 */
export function DiscussionsPage() {
  const [searchParams] = useSearchParams();

  return (
    <StarterPage
      title="Discussions"
      description="This page will show the discussion feed with tag filtering and search."
      sourceFile="src/features/discussions/pages/DiscussionsPage.tsx"
      routeValues={{ tag: searchParams.get('tag'), q: searchParams.get('q') }}
    >
      <RelatedLinks
        links={[
          { to: paths.discussionNew(), label: 'New post' },
          { to: paths.discussionDetail('post_seed_1'), label: 'Post detail (example)' },
          { to: paths.home(), label: 'Home' },
        ]}
      />
    </StarterPage>
  );
}
