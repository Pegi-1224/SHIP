import { RelatedLinks, StarterPage } from '@/shared/ui';
import { paths } from '@/shared/config/paths';

/**
 * Login (`/login`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/auth/components/EmailSignInForm.tsx` - email + code flow
 *   - `src/features/auth/components/EligibilityCheckbox.tsx`
 *   - `src/features/auth/components/MockAuthNotice.tsx`
 *   - `src/features/auth/hooks/useAuthMutations.ts` - all the mutations they call
 *
 * For development, use the dev sign-in shortcut on the Home page instead of
 * building this form - it signs in through the same mock endpoints without a
 * UI.
 */
export function LoginPage() {
  return (
    <StarterPage
      title="Login"
      description="This page will handle Google sign-in and email verification code entry for account access."
      sourceFile="src/features/auth/pages/LoginPage.tsx"
    >
      <RelatedLinks
        links={[{ to: paths.home(), label: 'Home (dev sign-in shortcut lives there)' }]}
      />
    </StarterPage>
  );
}
