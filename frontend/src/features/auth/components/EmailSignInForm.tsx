import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Code, Group, PinInput, Stack, Text, TextInput } from '@mantine/core';
import { KeyRound, Mail } from 'lucide-react';
import { isApiError } from '@/shared/api';
import { FormErrorAlert, SubmitButton } from '@/shared/ui';
import { useRequestEmailCode, useVerifyEmailCode } from '../hooks/useAuthMutations';
import {
  emailSchema,
  verificationCodeSchema,
  type EmailFormValues,
  type VerificationCodeFormValues,
} from '../schemas/authSchemas';

export interface EmailSignInFormProps {
  /**
   * The single eligibility declaration from the sign-in page (spec 2.1). The
   * page owns it so both sign-in methods share one checkbox instead of asking
   * the same question twice.
   */
  confirmsEligibility: boolean;
  /**
   * Called after a successful sign-in. Optional because the router already moves a signed-in user
   * off /login (see `RedirectIfAuthenticated`), so the page normally has nothing to add.
   */
  onSignedIn?: (isNewAccount: boolean) => void;
  /** The server wants the eligibility declaration, which the page's checkbox owns. */
  onEligibilityError?: (message: string) => void;
}

/**
 * A server validation error that names fields is shown next to those fields (the wrong code under
 * the code boxes, the declaration on the checkbox), so the banner would only repeat it.
 */
function bannerError(error: unknown): unknown {
  const hasFieldErrors =
    isApiError(error) && error.fieldErrors !== undefined && Object.keys(error.fieldErrors).length > 0;
  return hasFieldErrors ? null : error;
}

/**
 * Passwordless email sign-in (spec 3.2): request a code, then submit it.
 *
 * The typed email survives moving to the code step and surviving a failed
 * verification, so a wrong code never costs the user their input (spec 5.5).
 */
export function EmailSignInForm({
  confirmsEligibility,
  onSignedIn,
  onEligibilityError,
}: EmailSignInFormProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [mockCode, setMockCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const requestCode = useRequestEmailCode();
  const verifyCode = useVerifyEmailCode();

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const codeForm = useForm<VerificationCodeFormValues>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: { code: '' },
  });

  // useWatch is the subscription API; form.watch() returns a function that
  // cannot be memoized safely.
  const codeValue = useWatch({ control: codeForm.control, name: 'code' });

  // Count down the resend cooldown the server told us about.
  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const sendCode = async (address: string) => {
    const response = await requestCode.mutateAsync(address);
    setEmail(address);
    setMockCode(response.mockVerificationCode ?? null);
    setResendIn(response.resendAvailableInSeconds);
    setStep('code');
  };

  const handleEmailSubmit = emailForm.handleSubmit(async (values) => {
    try {
      await sendCode(values.email);
    } catch (error) {
      // The mutation holds the error; FormErrorAlert renders anything that is
      // not tied to a field. The typed email stays in the form so Retry
      // resubmits the same value.
      const emailError = isApiError(error) ? error.fieldErrors?.['email']?.[0] : undefined;
      if (emailError) emailForm.setError('email', { message: emailError });
    }
  });

  const handleCodeSubmit = codeForm.handleSubmit(async (values) => {
    try {
      const session = await verifyCode.mutateAsync({
        email,
        code: values.code,
        confirmsEligibility,
      });
      onSignedIn?.(session.isNewAccount);
    } catch (error) {
      // Map the server's field-level errors back onto the fields. The
      // eligibility error belongs to the page's checkbox, so hand it up.
      const fieldErrors = isApiError(error) ? error.fieldErrors : undefined;
      const codeError = fieldErrors?.['code']?.[0];
      if (codeError) codeForm.setError('code', { message: codeError });
      const eligibilityError = fieldErrors?.['confirmsEligibility']?.[0];
      if (eligibilityError) onEligibilityError?.(eligibilityError);
    }
  });

  if (step === 'email') {
    return (
      <form onSubmit={handleEmailSubmit} noValidate>
        <Stack gap="md">
          <TextInput
            {...emailForm.register('email')}
            type="email"
            label="Email address"
            placeholder="you@example.com"
            autoComplete="email"
            leftSection={<Mail size={16} aria-hidden="true" />}
            error={emailForm.formState.errors.email?.message}
            required
          />

          <FormErrorAlert
            error={bannerError(requestCode.error)}
            onRetry={() => void handleEmailSubmit()}
            isRetrying={requestCode.isPending}
          />

          <SubmitButton isPending={requestCode.isPending} pendingLabel="Sending code…" fullWidth>
            Send verification code
          </SubmitButton>
        </Stack>
      </form>
    );
  }

  return (
    <form onSubmit={handleCodeSubmit} noValidate>
      <Stack gap="md">
        <div>
          <Text size="sm">
            Enter the 6-digit code for <strong>{email}</strong>.
          </Text>
          <Button
            variant="subtle"
            size="compact-sm"
            px={0}
            onClick={() => {
              setStep('email');
              setMockCode(null);
            }}
          >
            Use a different email
          </Button>
        </div>

        {mockCode ? (
          <Alert
            color="ship"
            variant="light"
            title="Development code — no email was sent"
            icon={<KeyRound size={18} aria-hidden="true" />}
            role="note"
          >
            <Text size="sm">
              This server has no mail service, so it returned the code it generated:{' '}
              <Code>{mockCode}</Code>. A production server emails the code and never returns it in
              the response.
            </Text>
          </Alert>
        ) : null}

        <div>
          <Text component="label" htmlFor="verification-code" size="sm" fw={500} display="block" mb={6}>
            Verification code
          </Text>
          <PinInput
            id="verification-code"
            length={6}
            type="number"
            oneTimeCode
            aria-label="Verification code"
            value={codeValue}
            onChange={(value) => codeForm.setValue('code', value, { shouldValidate: false })}
          />
          {codeForm.formState.errors.code ? (
            <Text size="xs" c="var(--ship-color-danger)" mt={6} role="alert">
              {codeForm.formState.errors.code.message}
            </Text>
          ) : null}
        </div>

        <FormErrorAlert
          error={bannerError(verifyCode.error)}
          onRetry={() => void handleCodeSubmit()}
          isRetrying={verifyCode.isPending}
        />

        <Group justify="space-between" align="center">
          <Button
            variant="subtle"
            size="compact-sm"
            disabled={resendIn > 0 || requestCode.isPending}
            onClick={() => void sendCode(email)}
          >
            {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
          </Button>
          <SubmitButton isPending={verifyCode.isPending} pendingLabel="Verifying…">
            Verify and continue
          </SubmitButton>
        </Group>
      </Stack>
    </form>
  );
}
