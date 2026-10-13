/** Session and account types. */
import type { AnonymousIdentity, IsoDateString } from './common';

/**
 * How the session was created.
 *
 * Both values end in `_mock` because this build has no identity provider and
 * sends no email. They become `google` / `email_code` once a real backend is
 * wired up - see docs/backend-integration.md.
 */
export type AuthProvider = 'google_mock' | 'email_code_mock';

/**
 * The signed-in user as the app sees them.
 *
 * `email` and `displayName` are visible to this user only (spec 3.6). Nothing
 * here may be rendered next to a post, comment or message - those use
 * `anonymousIdentity` instead.
 */
export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  anonymousIdentity: AnonymousIdentity;
  authProvider: AuthProvider;
  createdAt: IsoDateString;
  /** Drives the assessment gate in the router. */
  hasCompletedAssessment: boolean;
  /** Drives the one-time instruction walkthrough after onboarding. */
  hasSeenInstructions: boolean;
}

/** What a successful sign-in returns. */
export interface AuthSessionResponse {
  user: SessionUser;
  /**
   * Opaque session credential issued by the mock backend.
   *
   * A real backend may instead set an httpOnly cookie and return no token at
   * all; `shared/api/authSession.ts` is the single place that would change.
   */
  token: string;
  /** True when the account was created by this request rather than signed in. */
  isNewAccount: boolean;
}

export interface RequestEmailCodeInput {
  email: string;
}

export interface RequestEmailCodeResponse {
  /** Seconds the user must wait before requesting another code. */
  resendAvailableInSeconds: number;
  /**
   * MOCK ONLY. The mock backend has no mail service, so it returns the code it
   * generated and the sign-in screen shows it in a clearly labelled panel.
   * A real backend must never return this field.
   */
  mockVerificationCode?: string;
}

export interface VerifyEmailCodeInput {
  email: string;
  code: string;
  /**
   * Required when the email is new. Confirms spec 2.1: the user states they
   * are a woman aged 18 or older. No identity verification is performed.
   */
  confirmsEligibility?: boolean;
}

/** The signed-in user's own posts and comments, shown on Profile. */
export interface ProfileActivity {
  postCount: number;
  commentCount: number;
  submissionCount: number;
}
