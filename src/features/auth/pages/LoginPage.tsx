import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Divider, Paper, Stack, Text, Title } from '@mantine/core';
import { ShieldCheck } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import { FormErrorAlert } from '@/shared/ui';
import { EligibilityCheckbox } from '../components/EligibilityCheckbox';
import { EmailSignInForm } from '../components/EmailSignInForm';
import { MockAuthNotice } from '../components/MockAuthNotice';
import { useMockGoogleSignIn } from '../hooks/useAuthMutations';
import styles from './LoginPage.module.css';

/**
 * Sign-in and registration (spec 3.2).
 *
 * After a successful sign-in the user goes to the assessment if they have not
 * taken it, otherwise back to wherever they were headed. `redirectTo` is only
 * honoured for in-app paths, so a crafted link cannot bounce someone to an
 * external site.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const googleSignIn = useMockGoogleSignIn();
  const [confirmsEligibility, setConfirmsEligibility] = useState(false);

  const requested = searchParams.get('redirectTo') ?? '';
  const redirectTo = requested.startsWith('/') && !requested.startsWith('//') ? requested : null;

  const handleSignedIn = (isNewAccount: boolean) => {
    // New accounts must take the assessment before anything else (spec 3.3).
    navigate(isNewAccount ? paths.assessment() : (redirectTo ?? paths.home()), { replace: true });
  };

  return (
    <div className={styles.page}>
      <Stack gap="lg" className={styles.column}>
        <div>
          <Title order={1} size="var(--ship-text-2xl)">
            Sign in to SHIP
          </Title>
          <Text size="sm" c="dimmed" mt={6}>
            Research workplace conditions, compare employers and talk to people who have been there.
          </Text>
        </div>

        <Paper withBorder p="md" className={styles.privacy}>
          <Stack gap={6}>
            <Text size="sm" fw={600} className={styles.privacyHeading}>
              <ShieldCheck size={16} aria-hidden="true" />
              Your privacy comes first
            </Text>
            <Text size="sm" c="dimmed">
              Your email is never shown to other users. Posts, comments and messages carry an
              anonymous name only.
            </Text>
          </Stack>
        </Paper>

        <MockAuthNotice />

        <Paper withBorder p="lg">
          <Stack gap="md">
            {/* One declaration for the whole page: both sign-in methods use it. */}
            <EligibilityCheckbox
              checked={confirmsEligibility}
              onChange={setConfirmsEligibility}
              error={
                googleSignIn.error && !confirmsEligibility
                  ? 'Please confirm this to create your account.'
                  : null
              }
            />

            <Button
              variant="default"
              fullWidth
              size="md"
              loading={googleSignIn.isPending}
              disabled={googleSignIn.isPending}
              onClick={() => {
                googleSignIn.mutate(
                  { confirmsEligibility },
                  { onSuccess: (session) => handleSignedIn(session.isNewAccount) },
                );
              }}
            >
              Continue with Google (mock)
            </Button>

            <FormErrorAlert error={googleSignIn.error} />

            <Divider label="or use your email" labelPosition="center" />

            <EmailSignInForm
              confirmsEligibility={confirmsEligibility}
              onSignedIn={handleSignedIn}
            />
          </Stack>
        </Paper>

        <Text size="xs" c="dimmed">
          By continuing you agree that the information you share is visible to other SHIP users in
          aggregated or anonymous form.
        </Text>
      </Stack>
    </div>
  );
}
