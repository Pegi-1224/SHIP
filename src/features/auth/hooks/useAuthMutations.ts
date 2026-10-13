/**
 * Sign-in, sign-out and account-deletion mutations.
 *
 * Each one writes the session credential through `shared/api/authSession.ts`
 * and then invalidates the session query, so `AuthProvider` - and every guard
 * that reads it - updates from one source of truth.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken, queryKeys, setAuthToken } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import type { AuthSessionResponse, VerifyEmailCodeInput } from '@/shared/types/user';
import { useAuth } from '@/app/providers/useAuth';
import {
  deleteAccount,
  markInstructionsSeen,
  mockGoogleSignIn,
  requestEmailCode,
  signOut as signOutRequest,
  verifyEmailCode,
} from '../api/authApi';

/** Step 1 of email sign-in. Also used by the "Resend code" button. */
export function useRequestEmailCode() {
  return useMutation({
    mutationFn: (email: string) => requestEmailCode({ email }),
  });
}

function useApplySession() {
  const queryClient = useQueryClient();

  return async (session: AuthSessionResponse) => {
    setAuthToken(session.token);
    queryClient.setQueryData(queryKeys.session.current, session.user);
    await queryClient.invalidateQueries({ queryKey: queryKeys.session.current });
  };
}

/** Step 2 of email sign-in. */
export function useVerifyEmailCode() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (input: VerifyEmailCodeInput) => verifyEmailCode(input),
    onSuccess: applySession,
  });
}

/**
 * DEVELOPMENT ONLY. Signs in without rendering the real sign-in form.
 *
 * It drives the same two mock endpoints a real sign-in uses
 * (`requestEmailCode` then `verifyEmailCode`), reading the verification code
 * back out of the mock response instead of asking a human to type it. This is
 * the "reuse the existing mock session mechanism" bypass called for while the
 * sign-in page is a starter placeholder: it exists so a developer can reach
 * every guarded starter route without building the real sign-in UI first.
 *
 * It only works in mock mode: a real backend never returns
 * `mockVerificationCode`, so this throws instead of doing anything silently
 * wrong. Callers must also hide the button that triggers this behind
 * `env.enableMocks`, which is already false in a production deployment.
 */
export function useDevSignIn() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: async (email: string) => {
      const { mockVerificationCode } = await requestEmailCode({ email });
      if (!mockVerificationCode) {
        throw new Error(
          'Dev sign-in only works in mock mode (VITE_ENABLE_MOCKS=true). A real backend does not return a code to skip the sign-in form with.',
        );
      }
      return verifyEmailCode({ email, code: mockVerificationCode, confirmsEligibility: true });
    },
    onSuccess: applySession,
  });
}

/** Simulated Google sign-in. No OAuth flow runs. */
export function useMockGoogleSignIn() {
  const applySession = useApplySession();

  return useMutation({
    mutationFn: (input: { confirmsEligibility?: boolean }) => mockGoogleSignIn(input),
    onSuccess: applySession,
  });
}

export function useSignOut() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSession } = useAuth();

  return useMutation({
    mutationFn: signOutRequest,
    // Local state is cleared either way: if the server already dropped the
    // session, leaving the user "signed in" in the UI would be worse.
    onSettled: () => {
      clearSession();
      navigate(paths.home(), { replace: true });
      // Navigate first, then wipe the cache, so nothing that belonged to the
      // previous account is still mounted when it is dropped.
      queryClient.clear();
    },
  });
}

/**
 * Deletes the account (spec 3.9, AC-9).
 *
 * One request. The backend removes the user's posts, the comments on them,
 * their submissions and both copies of every message, then recomputes the
 * affected company aggregates. The frontend only clears local state afterwards.
 */
export function useDeleteAccount() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearSession } = useAuth();

  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      clearAuthToken();
      clearSession();
      navigate(paths.home(), { replace: true });
      // Every cached list still holds the deleted account's data.
      queryClient.clear();
    },
  });
}

/** Records that the instruction walkthrough has been completed (spec 3.10). */
export function useMarkInstructionsSeen() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markInstructionsSeen,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.session.current }),
  });
}
