import { Alert, Button, Text } from '@mantine/core';
import { env } from '@/shared/config/env';
import { paths } from '@/shared/config/paths';
import { FormErrorAlert, RelatedLinks, StarterPage } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useDevCompleteAssessment } from '../hooks/useAssessment';

/**
 * Assessment (`/assessment`).
 *
 * This route sits inside `RequireAuth` but deliberately outside
 * `RequireAssessment` (see `src/app/router/AppRoutes.tsx`), so a developer can
 * always reach it once signed in.
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/onboarding/components/QuestionShell.tsx` - one-question-
 *     per-screen layout with a progress indicator
 *   - `src/features/onboarding/components/InstructionWalkthrough.tsx` - the
 *     post-assessment tour (currently not auto-mounted; see `src/app/App.tsx`)
 *   - `src/features/onboarding/schemas/assessmentSchema.ts` - validation for
 *     all five questions
 *   - `src/features/onboarding/hooks/useAssessment.ts` - `useSaveAssessment`,
 *     `useMyAssessment`
 */
export function AssessmentPage() {
  const { user } = useAuth();
  const devComplete = useDevCompleteAssessment();

  return (
    <StarterPage
      title="Assessment"
      description="This page will present the five-question onboarding assessment used to personalize discussion recommendations."
      sourceFile="src/features/onboarding/pages/AssessmentPage.tsx"
      routeValues={{ hasCompletedAssessment: String(user?.hasCompletedAssessment ?? false) }}
    >
      {user?.hasCompletedAssessment ? (
        <Alert color="teal" variant="light">
          Assessment already completed for this session. Routes that need it are reachable.
        </Alert>
      ) : env.enableMocks ? (
        <>
          <Text size="sm">
            Development-only shortcut: saves a fixed set of answers through the real{' '}
            <code>PUT /me/assessment</code> endpoint, so the <code>RequireAssessment</code> guard
            clears without building the real five-question form first.
          </Text>
          <Button
            loading={devComplete.isPending}
            onClick={() => devComplete.mutate()}
            w="fit-content"
          >
            Dev: complete assessment with default answers
          </Button>
          <FormErrorAlert
            error={devComplete.error}
            onRetry={() => devComplete.mutate()}
            isRetrying={devComplete.isPending}
          />
        </>
      ) : (
        <Text size="sm" c="dimmed">
          The dev shortcut is disabled because this build is configured for a real backend
          (<code>VITE_ENABLE_MOCKS=false</code>).
        </Text>
      )}

      <RelatedLinks
        links={[
          { to: paths.home(), label: 'Home' },
          { to: paths.profile(), label: 'Profile (real "retake assessment" entry point)' },
        ]}
      />
    </StarterPage>
  );
}
