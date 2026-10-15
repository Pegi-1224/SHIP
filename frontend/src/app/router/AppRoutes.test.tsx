/**
 * Route smoke tests.
 *
 * These prove the scaffolding that survived the move to starter pages: every
 * route resolves to its own component regardless of auth state (see the
 * "temporary, documented state" note in `AppRoutes.tsx` and
 * `docs/decisions-and-questions.md` DQ-19), and - because MSW is configured
 * to throw on an unhandled request (`src/test/setup.ts`) - a placeholder page
 * that accidentally fetched company data, discussion content or messages
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
  ['/', 'Home'],
  ['/login', 'Login'],
  ['/assessment', 'Assessment'],
  ['/profile', 'Profile'],
  ['/companies', 'Company Search'],
  ['/companies/new', 'Add Company'],
  ['/companies/northwind-systems', 'Company Profile'],
  ['/companies/northwind-systems/submit', 'Company Data Submission'],
  ['/compare', 'Compare Companies'],
  ['/discussions', 'Discussions'],
  ['/discussions/new', 'New Post'],
  ['/discussions/post_seed_1', 'Post Detail'],
  ['/discussions/post_seed_1/edit', 'Edit Post'],
  ['/messages', 'Messages'],
  ['/messages/conv_1', 'Conversation'],
];

describe('every route, for a signed-out visitor with no assessment', () => {
  it.each(ALL_ROUTES)('renders its own starter page at %s (expects "%s")', async (route, heading) => {
    renderAt(route);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path', async () => {
    renderAt('/this-route-does-not-exist');

    expect(
      await screen.findByRole('heading', { name: 'We could not find that page' }),
    ).toBeInTheDocument();
  });
});

describe('the same routes, for a fully onboarded signed-in user', () => {
  it.each(ALL_ROUTES)('still renders %s (expects "%s")', async (route, heading) => {
    await signInTestUser();

    renderAt(route);

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
  });
});

describe('RedirectIfAuthenticated (still applied to /login)', () => {
  it('lets a signed-out visitor see the Login starter page', async () => {
    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('redirects an already signed-in user away from /login', async () => {
    await signInTestUser();

    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });
});
