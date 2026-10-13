import { Button, Text } from '@mantine/core';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';

/**
 * Profile (`/profile`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/profile/components/DeleteAccountSection.tsx` - the
 *     confirm-by-typing-DELETE deletion flow, already wired to
 *     `useDeleteAccount`
 *   - `src/features/profile/hooks/useProfile.ts` - `useProfileActivity`,
 *     `useMyPosts`, `useMyComments`
 *   - `src/features/companies/hooks/useCompanies.ts` - `useMySubmissions`
 *
 * Sign-out is kept functional below (not a placeholder control): it is a
 * simple, meaningful action that helps a developer get back to the
 * signed-out state while testing guards.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const signOut = useSignOut();

  return (
    <StarterPage
      title="Profile"
      description="This page will show account details, contribution history, and controls for retaking the assessment, signing out, and deleting the account."
      sourceFile="src/features/profile/pages/ProfilePage.tsx"
      routeValues={{ signedInAs: user?.email }}
    >
      <Button size="xs" variant="light" onClick={() => signOut.mutate()} loading={signOut.isPending}>
        Sign out
      </Button>

      <Text size="xs" c="dimmed">
        Account deletion is deliberately not wired up on this starter page - it is destructive and
        the reusable component (<code>DeleteAccountSection</code>) already has its own confirmation
        flow. Import it from <code>src/features/profile/components/DeleteAccountSection.tsx</code>{' '}
        when building the real page.
      </Text>

      <RelatedLinks
        links={[
          { to: paths.assessment(), label: 'Retake assessment' },
          { to: paths.companies(), label: 'Companies' },
          { to: paths.discussions(), label: 'Discussions' },
          { to: paths.messages(), label: 'Messages' },
        ]}
      />
    </StarterPage>
  );
}
