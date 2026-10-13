/**
 * Mock authentication.
 *
 * NOTHING HERE IS REAL AUTHENTICATION.
 *   - `/auth/google/mock` runs no OAuth flow and contacts no Google service.
 *   - `/auth/email/request-code` sends no email. It generates a code and
 *     returns it in the response body so the demo can continue; a real backend
 *     must never do that.
 *   - The session token is a random string stored in the mock database. It is
 *     not signed and proves nothing.
 *
 * The purpose is to exercise the frontend's sign-in states, route guards and
 * 401 handling against a server that behaves plausibly.
 */
import { http, HttpResponse } from 'msw';
import type { AuthSessionResponse, SessionUser } from '@/shared/types/user';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db, nextId, nowIso, persist } from '../db';
import type { MockUser } from '../types';
import {
  currentUser,
  errorResponse,
  notFound,
  simulateLatency,
  unauthorized,
  url,
  validationError,
} from '../helpers';

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_SECONDS = 30;

export function toSessionUser(user: MockUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    anonymousIdentity: createAnonymousIdentity(user.id),
    authProvider: user.authProvider,
    createdAt: user.createdAt,
    hasCompletedAssessment: user.hasCompletedAssessment,
    hasSeenInstructions: user.hasSeenInstructions,
  };
}

function issueSession(user: MockUser, isNewAccount: boolean): AuthSessionResponse {
  const token = nextId('token');
  db().sessions[token] = user.id;
  persist();

  return { user: toSessionUser(user), token, isNewAccount };
}

function createUser(email: string, provider: MockUser['authProvider']): MockUser {
  const user: MockUser = {
    id: nextId('user'),
    email,
    // Visible to this account only (spec 3.6). Never shown to other users.
    displayName: email.split('@')[0] ?? 'You',
    authProvider: provider,
    createdAt: nowIso(),
    hasCompletedAssessment: false,
    hasSeenInstructions: false,
  };
  db().users.push(user);
  persist();
  return user;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const authHandlers = [
  /** Who is signed in. 401 when nobody is. */
  http.get(url('/auth/session'), async ({ request }) => {
    await simulateLatency(120);
    const user = currentUser(request);
    if (!user) return unauthorized('No active session.');
    return HttpResponse.json(toSessionUser(user));
  }),

  /** Step 1 of email sign-in. Generates a code; sends no email. */
  http.post(url('/auth/email/request-code'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? '';

    if (!EMAIL_PATTERN.test(email)) {
      return validationError('Enter a valid email address.', {
        email: ['Enter a valid email address.'],
      });
    }

    const existing = db().emailCodes.find((entry) => entry.email === email);
    if (existing) {
      const since = Date.now() - new Date(existing.requestedAt).getTime();
      if (since < RESEND_COOLDOWN_SECONDS * 1000) {
        return errorResponse(
          429,
          'rate_limited',
          `Please wait ${Math.ceil((RESEND_COOLDOWN_SECONDS * 1000 - since) / 1000)} seconds before requesting another code.`,
        );
      }
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const entry = {
      email,
      code,
      requestedAt: nowIso(),
      expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    };

    db().emailCodes = [...db().emailCodes.filter((item) => item.email !== email), entry];
    persist();

    return HttpResponse.json({
      resendAvailableInSeconds: RESEND_COOLDOWN_SECONDS,
      // MOCK ONLY. A real backend emails this and never returns it.
      mockVerificationCode: code,
    });
  }),

  /** Step 2 of email sign-in. */
  http.post(url('/auth/email/verify'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      confirmsEligibility?: boolean;
    };
    const email = body.email?.trim().toLowerCase() ?? '';
    const code = body.code?.trim() ?? '';

    const entry = db().emailCodes.find((item) => item.email === email);
    if (!entry) {
      return validationError('Request a new code first.', {
        code: ['Request a new code first.'],
      });
    }
    if (new Date(entry.expiresAt).getTime() < Date.now()) {
      return validationError('That code has expired. Request a new one.', {
        code: ['That code has expired. Request a new one.'],
      });
    }
    if (entry.code !== code) {
      return validationError('That code is not correct.', {
        code: ['That code is not correct.'],
      });
    }

    const existingUser = db().users.find((user) => user.email === email);

    // New accounts must confirm spec 2.1 eligibility. No identity check runs.
    if (!existingUser && body.confirmsEligibility !== true) {
      return validationError('Please confirm you are a woman aged 18 or older to create an account.', {
        confirmsEligibility: ['Please confirm to create your account.'],
      });
    }

    db().emailCodes = db().emailCodes.filter((item) => item.email !== email);

    const user = existingUser ?? createUser(email, 'email_code_mock');
    return HttpResponse.json(issueSession(user, !existingUser));
  }),

  /**
   * Simulated Google sign-in. Reuses one fixed demo account so the flow is
   * repeatable; no Google account is involved at any point.
   */
  http.post(url('/auth/google/mock'), async ({ request }) => {
    await simulateLatency();
    const body = (await request.json().catch(() => ({}))) as { confirmsEligibility?: boolean };

    const email = 'demo.google.user@example.com';
    const existingUser = db().users.find((user) => user.email === email);

    if (!existingUser && body.confirmsEligibility !== true) {
      return validationError('Please confirm you are a woman aged 18 or older to create an account.', {
        confirmsEligibility: ['Please confirm to create your account.'],
      });
    }

    const user = existingUser ?? createUser(email, 'google_mock');
    return HttpResponse.json(issueSession(user, !existingUser));
  }),

  http.post(url('/auth/sign-out'), async ({ request }) => {
    await simulateLatency(120);
    const header = request.headers.get('Authorization');
    if (header?.startsWith('Bearer ')) {
      const token = header.slice('Bearer '.length).trim();
      delete db().sessions[token];
      persist();
    }
    return new HttpResponse(null, { status: 204 });
  }),

  /** Marks the instruction walkthrough as finished (spec 3.10). */
  http.post(url('/me/instructions-seen'), async ({ request }) => {
    await simulateLatency(120);
    const user = currentUser(request);
    if (!user) return unauthorized();

    const record = db().users.find((item) => item.id === user.id);
    if (!record) return notFound();

    record.hasSeenInstructions = true;
    persist();
    return new HttpResponse(null, { status: 204 });
  }),
];
