import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

function feed() {
  return within(screen.getByRole('region', { name: /discussions|#/ }));
}

describe('DiscussionsPage', () => {
  it('lists every published post, newest first, with the total', async () => {
    renderAt('/discussions');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Latest discussions' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('25 posts')).toBeInTheDocument();
    expect(feed().getAllByRole('article')).toHaveLength(25);
  });

  it('filters by a sidebar tag, renames the heading and counts only those posts', async () => {
    const { user } = renderAt('/discussions');
    await screen.findByText('25 posts');

    const nav = within(screen.getByRole('navigation', { name: 'TAGS' }));
    await user.click(nav.getByRole('button', { name: '#maternity leave' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: '#maternity leave' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('5 posts')).toBeInTheDocument();
    expect(nav.getByRole('button', { name: '#maternity leave' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // Clicking the selected tag again goes back to every post.
    await user.click(nav.getByRole('button', { name: '#maternity leave' }));
    expect(await screen.findByText('25 posts')).toBeInTheDocument();
  });

  it('says so when a tag has no posts', async () => {
    renderAt('/discussions?tag=movement%20support');

    expect(
      await screen.findByText('No discussions tagged #movement support yet.'),
    ).toBeInTheDocument();
    expect(screen.getByText('0 posts')).toBeInTheDocument();
  });

  it("filters by a post's own tag, adding it to the sidebar", async () => {
    const { user } = renderAt('/discussions');
    await screen.findByText('25 posts');

    const [firstBenefits] = screen.getAllByRole('button', { name: 'Show posts tagged #benefits' });
    await user.click(firstBenefits as HTMLElement);

    expect(await screen.findByRole('heading', { level: 1, name: '#benefits' })).toBeInTheDocument();
    expect(await screen.findByText('5 posts')).toBeInTheDocument();
    const nav = within(screen.getByRole('navigation', { name: 'TAGS' }));
    expect(nav.getByRole('button', { name: '#benefits' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('opens a post from its card', async () => {
    const { user } = renderAt('/discussions');
    await screen.findByText('25 posts');

    await user.click(screen.getByRole('link', { name: 'How did you negotiate your first offer?' }));

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'How did you negotiate your first offer?',
      }),
    ).toBeInTheDocument();
  });

  it('links "+ New post" to the new post page', async () => {
    renderAt('/discussions');

    expect(await screen.findByRole('link', { name: '+ New post' })).toHaveAttribute(
      'href',
      '/discussions/new',
    );
  });
});
