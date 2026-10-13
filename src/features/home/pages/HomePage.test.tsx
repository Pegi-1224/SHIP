/**
 * Home page behaviour, including what a signed-out visitor may and may not do
 * (spec 2.2, AC-3) and the recommendation rules (spec 6.1, AC-1).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { PUBLIC_PREVIEW_POSTS_PER_TAG } from '@/shared/config/constants';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { markPostRead } from '@/features/discussions';
import { HomePage } from './HomePage';

describe('HomePage, signed out', () => {
  it('offers sign-up and no search bars at all', async () => {
    renderWithProviders(<HomePage />, { route: '/' });

    expect(await screen.findByRole('button', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Search companies')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Search discussions')).not.toBeInTheDocument();
  });

  it(`previews at most ${PUBLIC_PREVIEW_POSTS_PER_TAG} posts per tag`, async () => {
    renderWithProviders(<HomePage />, { route: '/' });

    await screen.findByText('What people are discussing');

    const previewHeadings = await screen.findAllByRole('heading', { level: 3 });
    expect(previewHeadings.length).toBeGreaterThan(0);

    // Each tag group reports how many it is showing, capped at the limit.
    const counts = await screen.findAllByText(/newest \d+$/);
    for (const node of counts) {
      const shown = Number(/newest (\d+)$/.exec(node.textContent ?? '')?.[1] ?? '0');
      expect(shown).toBeLessThanOrEqual(PUBLIC_PREVIEW_POSTS_PER_TAG);
    }
  });

  it('sends a signed-out visitor to sign-in instead of the post', async () => {
    renderWithProviders(<HomePage />, { route: '/' });

    const postLink = (await screen.findAllByRole('heading', { level: 3 }))[0];
    const anchor = postLink?.querySelector('a');

    expect(anchor?.getAttribute('href')).toMatch(/^\/login\?redirectTo=/);
  });
});

describe('HomePage, signed in', () => {
  it('recommends posts carrying the assessment tags and says why', async () => {
    await signInTestUser({
      assessment: {
        stage: 'employed_looking_to_switch',
        industries: ['Tech'],
        priorities: ['pay_equity'],
        topics: ['pay gap'],
        followedCompanyIds: [],
      },
    });

    renderWithProviders(<HomePage />, { route: '/' });

    expect(await screen.findByText('Recommended for you')).toBeInTheDocument();
    expect(await screen.findByText('Based on your assessment:')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', {
        level: 3,
        name: 'How did you find out you were underpaid?',
      }),
    ).toBeInTheDocument();
  });

  it('excludes posts the user has already opened', async () => {
    await signInTestUser({
      assessment: {
        stage: 'employed_looking_to_switch',
        industries: ['Tech'],
        priorities: ['safe_workplace'],
        topics: ['harassment support'],
        followedCompanyIds: [],
      },
    });

    const { queryClient } = renderWithProviders(<HomePage />, { route: '/' });

    const title = 'Reported a comment to HR - what happened next';
    expect(await screen.findByRole('heading', { level: 3, name: title })).toBeInTheDocument();

    // Opening a post detail page is what marks it read.
    await markPostRead('post_seed_6');
    await queryClient.invalidateQueries();

    await waitFor(() =>
      expect(screen.queryByRole('heading', { level: 3, name: title })).not.toBeInTheDocument(),
    );
  });

  it('says plainly when nothing unseen is left instead of recycling posts', async () => {
    await signInTestUser({
      assessment: {
        stage: 'employed_looking_to_switch',
        industries: ['Tech'],
        priorities: ['safe_workplace'],
        topics: ['harassment support'],
        followedCompanyIds: [],
      },
    });

    // Both fixture posts tagged #harassment support.
    await markPostRead('post_seed_6');
    await markPostRead('post_seed_15');

    renderWithProviders(<HomePage />, { route: '/' });

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    expect(
      await screen.findByText(/Refreshing will not surface new ones until someone posts again/),
    ).toBeInTheDocument();
  });

  it('prompts for the assessment instead of recommending nothing', async () => {
    await signInTestUser({ assessment: null });

    renderWithProviders(<HomePage />, { route: '/' });

    expect(await screen.findByText('One quick step left')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start the assessment' })).toBeInTheDocument();
  });
});
