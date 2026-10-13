import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * Write a new post (`/discussions/new`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/discussions/components/PostForm.tsx` - the composer
 *     shared by "new" and "edit", already wired to tag search/creation
 *   - `src/features/discussions/schemas/postSchema.ts` - title/body/tags
 *     validation
 *   - `src/features/discussions/hooks/useDiscussions.ts` - `useCreatePost`
 */
export function NewPostPage() {
  return (
    <StarterPage
      title="New Post"
      description="This page will provide a form for creating a new discussion post."
      sourceFile="src/features/discussions/pages/NewPostPage.tsx"
    >
      <RelatedLinks links={[{ to: paths.discussions(), label: 'Discussion feed' }]} />
    </StarterPage>
  );
}
