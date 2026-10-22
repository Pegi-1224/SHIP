import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

describe('header search on Home', () => {
  it('lists every demo company before anything is typed', async () => {
    renderAt('/');
    expect(await screen.findByText('All 8 demo companies')).toBeInTheDocument();
  });

  it('shows companies with a similar name as the user types, with every field on demand', async () => {
    const { user } = renderAt('/');
    await screen.findByText('All 8 demo companies');

    await user.type(screen.getByRole('textbox', { name: 'Search companies' }), 'orchid');

    expect(await screen.findByText('1 company similar to "orchid"')).toBeInTheDocument();
    const card = screen.getByRole('article');
    expect(within(card).getByRole('heading', { name: 'Orchid Ridge Bank' })).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: 'Show details' }));
    expect(within(card).getByText(/14 weeks at 100% pay/)).toBeInTheDocument();
    expect(within(card).getByText('hr@orchid-ridge-bank.example')).toBeInTheDocument();
  });

  it('keeps the space between two words while typing', async () => {
    const { user } = renderAt('/');
    await screen.findByText('All 8 demo companies');
    const input = screen.getByRole('textbox', { name: 'Search companies' });

    await user.type(input, 'orchid ');
    await screen.findByText('1 company similar to "orchid"');
    await user.type(input, 'ridge');

    expect(input).toHaveValue('orchid ridge');
  });

  it('says so when nothing is similar', async () => {
    const { user } = renderAt('/');
    await screen.findByText('All 8 demo companies');

    await user.type(screen.getByRole('textbox', { name: 'Search companies' }), 'zzzqqq{Enter}');

    expect(await screen.findByText('No similar companies')).toBeInTheDocument();
  });
});

describe('header search on Discussions', () => {
  it('matches posts by tag, title or content', async () => {
    const { user } = renderAt('/discussions');
    await screen.findByText('All 10 demo posts, newest first');

    await user.type(screen.getByRole('textbox', { name: 'Search discussions' }), 'maternity leave');

    expect(await screen.findByText(/posts? matching "maternity leave"/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Coming back from maternity leave - tips?' }),
    ).toBeInTheDocument();
  });
});
