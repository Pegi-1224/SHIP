import { useState } from 'react';
import { Button, Divider } from '@mantine/core';
import { isApiError } from '@/shared/api';
import { env } from '@/shared/config/env';
import { FormErrorAlert } from '@/shared/ui';
import { EligibilityCheckbox } from '../components/EligibilityCheckbox';
import { EmailSignInForm } from '../components/EmailSignInForm';
import { MockAuthNotice } from '../components/MockAuthNotice';
import { useMockGoogleSignIn } from '../hooks/useAuthMutations';
import styles from './LoginPage.module.css';

/**
 * Login and sign-up (`/login`, spec 2.1, 3.2).
 *
 * One screen for both: an address that already has an account signs in, a new one creates it, and
 * the server decides which. Email only needs a code, no password.
 *
 * This page does not navigate after sign-in. `RedirectIfAuthenticated` (the route guard) sees the
 * new session and sends the user on - to the assessment for a new account, otherwise back to where
 * they were headed (`?redirectTo=`) or Home.
 *
 * The eligibility checkbox (spec 2.1) is declared once here and shared by both sign-in methods.
 * It is only *required* when an account is being created, which the server decides, so the
 * server's answer is what turns it red.
 */
export function LoginPage() {
  const [confirmsEligibility, setConfirmsEligibility] = useState(false);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const googleSignIn = useMockGoogleSignIn();

  const changeEligibility = (checked: boolean) => {
    setConfirmsEligibility(checked);
    if (checked) setEligibilityError(null);
  };

  const handleGoogle = () => {
    googleSignIn.mutate(
      { confirmsEligibility },
      {
        onError: (error) => {
          const message = isApiError(error) ? error.fieldErrors?.['confirmsEligibility']?.[0] : null;
          if (message) setEligibilityError(message);
        },
      },
    );
  };

  return (
    <section className={styles.page} aria-labelledby="login-title">
      <div className={styles.card}>
        <h1 id="login-title" className={styles.title}>
          Sign in or create an account
        </h1>
        <p className={styles.subtitle}>
          Enter your email and we will send you a 6-digit code. There is no password to remember.
        </p>

        <div className={styles.eligibility}>
          <EligibilityCheckbox
            checked={confirmsEligibility}
            onChange={changeEligibility}
            error={eligibilityError}
          />
          <p className={styles.eligibilityNote}>
            Only needed the first time, when your account is created.
          </p>
        </div>

        <EmailSignInForm
          confirmsEligibility={confirmsEligibility}
          onEligibilityError={setEligibilityError}
        />

        {env.enableMocks ? (
          <>
            <Divider label="or" labelPosition="center" my="lg" />
            <Button variant="default" fullWidth onClick={handleGoogle} loading={googleSignIn.isPending}>
              Continue with Google (demo account)
            </Button>
            <div className={styles.googleError}>
              <FormErrorAlert error={googleSignIn.error} />
            </div>
          </>
        ) : null}

        <div className={styles.notice}>
          <MockAuthNotice />
        </div>
      </div>
    </section>
  );
}
