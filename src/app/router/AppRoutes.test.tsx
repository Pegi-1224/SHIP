/**
 * Route and guard smoke tests.
 *
 * These prove the scaffolding that survived the move to starter pages: every
 * route still resolves to a component, guards still redirect correctly, and
 * - because MSW is configured to throw on an unhandled request
 * (`src/test/setup.ts`) - a placeholder page that accidentally fetched company
 * data, discussion content or messages would fail these tests immediately.
 * That is the "no unwanted API calls" check for this refactor.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { AppRoutes } from './AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

describe('public routes', () => {
  it('renders the Home starter page for a signed-out visitor', async () => {
    renderAt('/');

    expect(await screen.findByRole('heading', { name: 'Home' })).toBeInTheDocument();
    expect(await screen.findByText(/Dev sign in \(mock\)/)).toBeInTheDocument();
  });

  it('renders the Login starter page', async () => {
    renderAt('/login');

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument();
  });

  it('renders the not-found page for an unknown path', async () => {
    renderAt('/this-route-does-not-exist');

    expect(
      await screen.findByRole('heading', { name: 'We could not find that page' }),
    ).toBeInTheDocument();
  });
});

describe('auth guard (RequireAuth)', () => {
  it('redirects a signed-out visitor away from a guarded route, to login', async () => {
    renderAt('/profile');

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument());
  });

  it('lets a signed-in user reach a route gated only by RequireAuth', async () => {
    await signInTestUser({ assessment: null });

    renderAt('/profile');

    expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
  });
});

describe('assessment guard (RequireAssessment)', () => {
  it('redirects to /assessment when the assessment is not complete', async () => {
    await signInTestUser({ assessment: null });

    renderAt('/companies');

    expect(await screen.findByRole('heading', { name: 'Assessment' })).toBeInTheDocument();
  });

  it('does not gate /assessment itself, avoiding a redirect loop', async () => {
    await signInTestUser({ assessment: null });

    renderAt('/assessment');

    expect(await screen.findByRole('heading', { name: 'Assessment' })).toBeInTheDocument();
    expect(screen.getByText(/Dev: complete assessment with default answers/)).toBeInTheDocument();
  });

  it('lets a fully onboarded user reach every assessment-gated starter page', async () => {
    await signInTestUser();

    for (const [route, heading] of [
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
    ] as const) {
      const { unmount } = renderAt(route);
      expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
      unmount();
    }
  });
});
