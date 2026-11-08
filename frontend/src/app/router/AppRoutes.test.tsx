/**
 * Route smoke tests.
 *
 * These prove the scaffolding that survived the move to starter pages: every
 * route resolves to its own component regardless of auth state (see the
 * "temporary, documented state" note in `AppRoutes.tsx` and
 * `docs/decisions-and-questions.md` DQ-19), and - because MSW is configured
 * to throw on an unhandled request (`src/test/setup.ts`) - a placeholder page
 * that accidentally fetched company data or discussion content
 * would fail these tests immediately. That is the "no unwanted API calls"
 * check for this refactor.
 *
 * `RequireAuth` and `RequireAssessment` are not applied to any route right
 * now, so they are not exercised here - see `guards.test.tsx`, which drives
 * both directly and proves they still redirect correctly, ready to be
 * reinstated per route.
 */
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { AppRoutes } from './AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

const ALL_ROUTES: Array<[string, string]> = [
  ['/', 'Latest discussions'],
  ['/login', 'Create your account'],
  ['/welcome', 'Look up any company'],
  ['/assessment', 'Personalize your SHIP'],
  // Profile's heading is the user's name; the mock names an account after its email.
  ['/profile', 'test.user'],
  ['/companies/new', 'Add this company'],
  ['/companies/lumen-harbor-analytics', 'Lumen Harbor Analytics'],
  ['/compare', 'Compare companies'],
  ['/discussions', 'Latest discussions'],
  ['/discussions/new', 'Start a discussion'],
  ['/discussions/post_0001', 'How did you negotiate your first offer?'],
  ['/discussions/post_0001/edit', 'You can only edit your own posts'],
];

// /welcome, /assessment and /profile are behind RequireAuth, so a signed-out visitor is sent to log in.
const SIGNED_OUT_ROUTES = ALL_ROUTES.filter(
  ([route]) => !['/welcome', '/assessment', '/profile'].includes(route),
);

describe('every route, for a signed-out visitor with no assessment', () => {
  it.each(SIGNED_OUT_ROUTES)(
    'renders its own starter page at %s (expects "%s")',
    async (route, heading) => {
      renderAt(route);

      // `hidden: true` skips a visibility check per element, too slow on big pages (company page).
      expect(
        await screen.findByRole('heading', { name: heading, hidden: true }),
      ).toBeInTheDocument();
    },
  );

  it.each(['/welcome', '/assessment', '/profile'])(
    'sends a signed-out visitor from %s to log in',
    async (route) => {
      renderAt(route);

      expect(
        await screen.findByRole('heading', { name: 'Create your account' }),
      ).toBeInTheDocument();
    },
  );

  it('renders the not-found page for an unknown path', async () => {
    renderAt('/this-route-does-not-exist');

    expect(
      await screen.findByRole('heading', { name: 'We could not find that page' }),
    ).toBeInTheDocument();
  });
});

/** Signed in, Home greets the user instead of listing the latest discussions. */
const SIGNED_IN_GREETING = /^Good (morning|afternoon|evening), /;
// A signed-in user is sent away from /login (see the RedirectIfAuthenticated tests below).
const SIGNED_IN_ROUTES: Array<[string, string | RegExp]> = ALL_ROUTES.filter(
  ([route]) => route !== '/login',
).map(([route, heading]) => (route === '/' ? [route, SIGNED_IN_GREETING] : [route, heading]));

describe('the same routes, for a fully onboarded signed-in user', () => {
  it.each(SIGNED_IN_ROUTES)('still renders %s (expects "%s")', async (route, heading) => {
    await signInTestUser();

    renderAt(route);

    expect(await screen.findByRole('heading', { name: heading, hidden: true })).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated (applied to /login)', () => {
  it('lets a signed-out visitor see the sign-in page', async () => {
    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  });

  it('redirects an already signed-in user away from /login', async () => {
    await signInTestUser();

    renderAt('/login');

    expect(await screen.findByRole('heading', { name: SIGNED_IN_GREETING })).toBeInTheDocument();
  });
});
