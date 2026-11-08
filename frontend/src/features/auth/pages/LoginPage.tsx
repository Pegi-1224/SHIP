import { useState } from 'react';
import { ChartColumn, Lock, MessageCircle, ShieldCheck } from 'lucide-react';
import { isApiError } from '@/shared/api';
import { env } from '@/shared/config/env';
import { FormErrorAlert } from '@/shared/ui';
import { EligibilityCheckbox } from '../components/EligibilityCheckbox';
import { EmailSignInForm } from '../components/EmailSignInForm';
import { MockAuthNotice } from '../components/MockAuthNotice';
import { useMockGoogleSignIn } from '../hooks/useAuthMutations';
import styles from './LoginPage.module.css';

const FEATURES = [
  { icon: ChartColumn, label: 'Compare companies' },
  { icon: MessageCircle, label: 'Talk anonymously' },
  { icon: Lock, label: 'Your privacy first.' },
] as const;

/** Google's "G" in its four colours. */
function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

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
 * The eligibility checkbox (spec 2.1) is declared once here and shared by both sign-in methods; it
 * sits inside the email form, above its button. It is only *required* when an account is being
 * created, which the server decides, so the server's answer is what turns it red.
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
          const message = isApiError(error)
            ? error.fieldErrors?.['confirmsEligibility']?.[0]
            : null;
          if (message) setEligibilityError(message);
        },
      },
    );
  };

  return (
    <section className={styles.page} aria-labelledby="login-title">
      <div className={styles.layout}>
        <div className={styles.hero}>
          <p className={styles.badge}>
            <span aria-hidden="true">●</span> Built by women, for women
          </p>
          <p className={styles.headline}>
            Find a workplace
            <br />
            that <em>has your back.</em>
          </p>
          <p className={styles.lead}>
            Real pay, promotion and maternity leave data from other career-driven women. An
            anonymous community to ask what you can’t ask in an interview.
          </p>
          <ul className={styles.features}>
            {FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className={styles.feature}>
                <Icon size={20} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.card}>
          <h1 id="login-title" className={styles.title}>
            Create your account
          </h1>

          {/* The backend has no Google sign-in yet, so the demo button only shows with mock data. */}
          {env.enableMocks ? (
            <>
              <button
                type="button"
                className={styles.google}
                onClick={handleGoogle}
                disabled={googleSignIn.isPending}
                aria-busy={googleSignIn.isPending || undefined}
              >
                <GoogleMark />
                Continue with Google
              </button>
              <div className={styles.googleError}>
                <FormErrorAlert error={googleSignIn.error} />
              </div>
              <p className={styles.divider}>or with email</p>
            </>
          ) : null}

          <EmailSignInForm
            confirmsEligibility={confirmsEligibility}
            onEligibilityError={setEligibilityError}
            eligibility={
              <EligibilityCheckbox
                checked={confirmsEligibility}
                onChange={changeEligibility}
                error={eligibilityError}
              />
            }
          />

          <p className={styles.privacy}>
            <ShieldCheck
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
              className={styles.privacyIcon}
            />
            Your privacy comes first. Your email is never shown to other users.
          </p>

          <div className={styles.notice}>
            <MockAuthNotice />
          </div>
        </div>
      </div>
    </section>
  );
}
