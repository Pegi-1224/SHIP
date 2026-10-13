/**
 * Authentication API functions.
 *
 * Every endpoint here is answered by `src/mocks/handlers/auth.ts` in mock mode.
 * None of them talks to Google or sends an email - see the `_mock` suffixes on
 * `AuthProvider` and the labels in the sign-in UI. The proposed real contract
 * is in docs/api-contract.md.
 */
import { api, isApiError } from '@/shared/api';
import type {
  AuthSessionResponse,
  RequestEmailCodeInput,
  RequestEmailCodeResponse,
  SessionUser,
  VerifyEmailCodeInput,
} from '@/shared/types/user';

/**
 * Who is signed in.
 *
 * Returns `null` rather than throwing on 401, because "signed out" is a normal
 * state for this call, not an error the user should see.
 */
export async function fetchSession(signal?: AbortSignal): Promise<SessionUser | null> {
  try {
    return await api.get<SessionUser>('/auth/session', {
      signal,
      skipUnauthorizedHandler: true,
    });
  } catch (error) {
    if (isApiError(error) && error.code === 'unauthorized') return null;
    throw error;
  }
}

/** Step 1 of email sign-in: ask for a verification code. */
export function requestEmailCode(
  input: RequestEmailCodeInput,
  signal?: AbortSignal,
): Promise<RequestEmailCodeResponse> {
  return api.post<RequestEmailCodeResponse>('/auth/email/request-code', input, {
    auth: false,
    signal,
    skipUnauthorizedHandler: true,
  });
}

/** Step 2 of email sign-in: submit the code and receive a session. */
export function verifyEmailCode(
  input: VerifyEmailCodeInput,
  signal?: AbortSignal,
): Promise<AuthSessionResponse> {
  return api.post<AuthSessionResponse>('/auth/email/verify', input, {
    auth: false,
    signal,
    skipUnauthorizedHandler: true,
  });
}

/**
 * Simulated Google sign-in.
 *
 * There is no OAuth flow, no consent screen and no Google account involved.
 * The mock backend creates or reuses a demo account and returns a session.
 * Replacing this with real Google sign-in is a backend-coordinated change -
 * see docs/backend-integration.md.
 */
export function mockGoogleSignIn(
  input: { confirmsEligibility?: boolean },
  signal?: AbortSignal,
): Promise<AuthSessionResponse> {
  return api.post<AuthSessionResponse>('/auth/google/mock', input, {
    auth: false,
    signal,
    skipUnauthorizedHandler: true,
  });
}

/** Ends the session. The backend must also invalidate it server-side. */
export function signOut(): Promise<void> {
  return api.post<void>('/auth/sign-out');
}

/**
 * Deletes the account.
 *
 * The frontend calls one endpoint. Removing the user's posts, comments, the
 * comments other people left on those posts, their company submissions and
 * both sides of every direct message - and recomputing the affected company
 * aggregates - is the backend's job (spec 3.9, AC-9). The client must never
 * try to enumerate and delete those records itself.
 */
export function deleteAccount(): Promise<void> {
  return api.delete<void>('/me');
}

/** Records that the user finished the instruction walkthrough (spec 3.10). */
export function markInstructionsSeen(): Promise<void> {
  return api.post<void>('/me/instructions-seen');
}
