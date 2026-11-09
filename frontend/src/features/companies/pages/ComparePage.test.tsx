import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { AppRoutes } from '@/app/router/AppRoutes';
import { renderWithProviders } from '@/test/renderWithProviders';

/** The input of a compare-bar box (Mantine labels its dropdown list the same way). */
const pickerInput = (name: string) => screen.getByRole('combobox', { name });

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

describe('ComparePage', () => {
  it('opens from the company page with that company on the left', async () => {
    const { user } = renderAt('/companies/lumen-harbor-analytics');

    await user.click(await screen.findByRole('link', { name: 'Compare' }));

    expect(
      await screen.findByRole('link', { name: /Back to Lumen Harbor Analytics/ }),
    ).toBeInTheDocument();
    expect(pickerInput('First company')).toHaveValue('Lumen Harbor Analytics');
    expect(
      screen.getByText(/Search for a company to compare with Lumen Harbor Analytics/),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compare' })).toBeDisabled();
  });

  it('compares once a second company is chosen and Compare is pressed', async () => {
    const { user } = renderAt('/compare?a=lumen-harbor-analytics');

    const second = await screen.findByRole('combobox', { name: 'Second company' });
    await user.type(second, 'Brightfern');
    // jsdom never finishes Mantine's open transition, so the list counts as hidden.
    const list = within(
      await screen.findByRole('listbox', { name: 'Second company', hidden: true }),
    );
    await user.click(await list.findByRole('option', { name: 'Brightfern Health', hidden: true }));
    await user.click(screen.getByRole('button', { name: 'Compare' }));

    const summary = within(await screen.findByRole('region', { name: 'Summary' }));
    expect(
      summary.getByText(
        /Brightfern Health’s average salary is 10% higher than Lumen Harbor Analytics’\./,
      ),
    ).toBeInTheDocument();
    expect(summary.getByText('Brightfern Health leads in 4 of 4 areas')).toBeInTheDocument();

    const salary = within(screen.getByRole('region', { name: 'Salary' }));
    expect(salary.getByText('$128,000')).toBeInTheDocument();
    expect(salary.getByText('$141,000')).toBeInTheDocument();
    expect(salary.getByText('Public data')).toBeInTheDocument();
  });

  it('shows a saved comparison straight from its link', async () => {
    renderAt('/compare?a=lumen-harbor-analytics&b=brightfern-health');

    const leave = within(await screen.findByRole('region', { name: 'Paid maternity leave' }));
    expect(leave.getByText('16wk')).toBeInTheDocument();
    expect(leave.getByText('20wk')).toBeInTheDocument();
  });

  it('switches a box between public data and user reports', async () => {
    const { user } = renderAt('/compare?a=lumen-harbor-analytics&b=brightfern-health');

    const salary = within(await screen.findByRole('region', { name: 'Salary' }));
    const publicButton = salary.getByRole('button', { name: 'Public data' });
    const userButton = salary.getByRole('button', { name: 'User reported' });
    expect(publicButton).toHaveAttribute('aria-pressed', 'true');
    expect(salary.getByText('$128,000')).toBeInTheDocument();

    await user.click(userButton);
    expect(userButton).toHaveAttribute('aria-pressed', 'true');
    expect(publicButton).toHaveAttribute('aria-pressed', 'false');
    expect(salary.getByText('$121,000')).toBeInTheDocument();
    expect(salary.getByText('$146,000')).toBeInTheDocument();
    expect(salary.getByText('Brightfern Health: from 15 submissions')).toBeInTheDocument();

    // Each box keeps its own choice.
    const leave = within(screen.getByRole('region', { name: 'Paid maternity leave' }));
    expect(leave.getByRole('button', { name: 'Public data' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});
