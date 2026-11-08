import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { DEFAULT_TEST_ASSESSMENT, signInTestUser } from '@/test/signIn';
import { AppRoutes } from '@/app/router/AppRoutes';
import { greetingFor } from '../utils/greeting';

function renderHome() {
  return renderWithProviders(<AppRoutes />, { route: '/' });
}

/** Healthcare has exactly one demo company, so the "random" pick is known. */
async function signInWithTopics() {
  return signInTestUser({
    email: 'maya@example.com',
    assessment: {
      ...DEFAULT_TEST_ASSESSMENT,
      industries: ['Healthcare'],
      topics: ['maternity leave', 'pay gap'],
    },
  });
}

function feedTitles() {
  const feed = screen.getByRole('region', { name: /^Good / });
  return within(feed)
    .getAllByRole('heading', { level: 3 })
    .map((heading) => heading.textContent);
}

describe('greetingFor', () => {
  it.each([
    [7, 'Good morning'],
    [11, 'Good morning'],
    [12, 'Good afternoon'],
    [17, 'Good afternoon'],
    [18, 'Good evening'],
    [2, 'Good evening'],
  ])('at %i:00 says "%s"', (hour, greeting) => {
    expect(greetingFor(new Date(2026, 9, 30, hour))).toBe(greeting);
  });
});

describe('HomePage, signed in', () => {
  it('greets the user by name and lists the newest posts on their topics', async () => {
    await signInWithTopics();
    renderHome();

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /^Good (morning|afternoon|evening), maya$/,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('FOR YOU')).toBeInTheDocument();
    await waitFor(() => expect(feedTitles()).toHaveLength(5));
    expect(feedTitles()[0]).toBe('Found out a male colleague with the same title earns 18% more');
    // Every author is anonymous.
    const feed = screen.getByRole('region', { name: /^Good / });
    expect(within(feed).queryByText(/Alice|Priya|Sofia/)).not.toBeInTheDocument();
  });

  it('shows the next posts on Refresh, then wraps back to the newest', async () => {
    await signInWithTopics();
    const { user } = renderHome();
    await waitFor(() => expect(feedTitles()).toHaveLength(5));
    const first = feedTitles();

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() =>
      expect(feedTitles()[0]).toBe('Pumping rooms: what does your office actually have?'),
    );
    expect(feedTitles()).not.toEqual(first);

    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(feedTitles()).toEqual(first));
  });

  it('suggests a company from the user’s industries and links to its page', async () => {
    await signInWithTopics();
    renderHome();

    const box = within(await screen.findByRole('region', { name: 'Look up a company' }));
    expect(await box.findByText('Brightfern Health')).toBeInTheDocument();
    for (const label of ['Pay', 'Promotion', 'Support', 'Benefits', 'Maternity leave']) {
      expect(box.getByText(label)).toBeInTheDocument();
    }
    expect(box.getByRole('link', { name: 'Look up the details' })).toHaveAttribute(
      'href',
      '/companies/brightfern-health',
    );
  });

  it('lists the assessment topics with a retake link, and the three trending tags', async () => {
    await signInWithTopics();
    renderHome();

    const topics = within(await screen.findByRole('region', { name: 'Your topics' }));
    expect(await topics.findByRole('link', { name: '#maternity leave' })).toHaveAttribute(
      'href',
      '/discussions?tag=maternity%20leave',
    );
    expect(topics.getByRole('link', { name: '#pay gap' })).toBeInTheDocument();
    expect(topics.getByText('Based on your assessment answers.')).toBeInTheDocument();
    expect(topics.getByRole('link', { name: 'Retake assessment' })).toHaveAttribute(
      'href',
      '/assessment',
    );

    const trending = within(screen.getByRole('region', { name: 'Trending' }));
    const rows = await trending.findAllByRole('link');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('#career goals6 posts');
  });
});
