import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

describe('header search on Home', () => {
  it('shows the latest discussions per tag, not companies, before anything is typed', async () => {
    renderAt('/');
    expect(await screen.findByRole('heading', { name: 'Latest discussions' })).toBeInTheDocument();
    for (const tag of ['#pay gap', '#maternity leave', '#career goals']) {
      const column = screen.getByRole('region', { name: tag });
      await waitFor(() => expect(within(column).getAllByRole('article')).toHaveLength(2));
    }
    expect(screen.queryByRole('heading', { name: 'Companies' })).not.toBeInTheDocument();
  });

  it('greets signed-out visitors with the sign-up banner', async () => {
    renderAt('/');
    expect(
      await screen.findByRole('heading', { name: 'Find a workplace that has your back.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/login');
  });

  it('shows companies with a similar name as the user types, and opens the company page', async () => {
    const { user } = renderAt('/');
    await screen.findByRole('heading', { name: 'Latest discussions' });

    await user.type(screen.getByRole('textbox', { name: 'Search companies' }), 'orchid');

    expect(await screen.findByText('1 company similar to "orchid"')).toBeInTheDocument();
    const card = screen.getByRole('article');
    await user.click(within(card).getByRole('link', { name: 'Orchid Ridge Bank' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Orchid Ridge Bank' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Salary' })).toBeInTheDocument();
  });

  it('keeps the space between two words while typing', async () => {
    const { user } = renderAt('/');
    await screen.findByRole('heading', { name: 'Latest discussions' });
    const input = screen.getByRole('textbox', { name: 'Search companies' });

    await user.type(input, 'orchid ');
    await screen.findByText('1 company similar to "orchid"');
    await user.type(input, 'ridge');

    expect(input).toHaveValue('orchid ridge');
  });

  it('says so when nothing is similar', async () => {
    const { user } = renderAt('/');
    await screen.findByRole('heading', { name: 'Latest discussions' });

    await user.type(screen.getByRole('textbox', { name: 'Search companies' }), 'zzzqqq{Enter}');

    expect(await screen.findByText('No similar companies')).toBeInTheDocument();
  });
});

describe('header search on Discussions', () => {
  it('matches posts by tag, title or content', async () => {
    const { user } = renderAt('/discussions');
    await screen.findByText('25 posts');

    await user.type(screen.getByRole('textbox', { name: 'Search discussions' }), 'maternity leave');

    expect(await screen.findByText(/posts? matching "maternity leave"/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Coming back from maternity leave - tips?' }),
    ).toBeInTheDocument();
  });
});
