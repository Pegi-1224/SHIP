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
  onSignedIn: (isNewAccount: boolean) => void;
}

/**
 * Passwordless email sign-in (spec 3.2): request a code, then submit it.
 *
 * The typed email survives moving to the code step and surviving a failed
 * verification, so a wrong code never costs the user their input (spec 5.5).
 */
export function EmailSignInForm({ confirmsEligibility, onSignedIn }: EmailSignInFormProps) {
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
    } catch {
      // The mutation holds the error; FormErrorAlert renders it. The typed
      // email stays in the form so Retry resubmits the same value.
    }
  });

  const handleCodeSubmit = codeForm.handleSubmit(async (values) => {
    try {
      const session = await verifyCode.mutateAsync({
        email,
        code: values.code,
        confirmsEligibility,
      });
      onSignedIn(session.isNewAccount);
    } catch (error) {
      // Map the server's field-level error back onto the code field. The
      // eligibility error is shown by the page, which owns that checkbox.
      const codeError = isApiError(error) ? error.fieldErrors?.['code']?.[0] : undefined;
      if (codeError) codeForm.setError('code', { message: codeError });
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
            error={requestCode.error}
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
            title="Mock code — no email was sent"
            icon={<KeyRound size={18} aria-hidden="true" />}
            role="note"
          >
            <Text size="sm">
              The mock API generated <Code>{mockCode}</Code>. A real backend would email this and
              never return it in the response.
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
          error={verifyCode.error}
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
