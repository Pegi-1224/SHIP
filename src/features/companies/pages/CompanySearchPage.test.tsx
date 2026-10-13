import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { CompanySearchPage } from './CompanySearchPage';

describe('CompanySearchPage', () => {
  it('prompts for a query before searching', async () => {
    await signInTestUser();
    renderWithProviders(<CompanySearchPage />, { route: '/companies' });

    expect(await screen.findByText('Search for a company')).toBeInTheDocument();
  });

  it('finds a company and links to its profile', async () => {
    await signInTestUser();
    const { user } = renderWithProviders(<CompanySearchPage />, { route: '/companies' });

    await user.type(screen.getByLabelText('Search companies'), 'Northwind{Enter}');

    const link = await screen.findByRole('link', { name: 'Northwind Systems' });
    expect(link).toHaveAttribute('href', '/companies/northwind-systems');
  });

  it('offers to add the company when nothing matches', async () => {
    await signInTestUser();
    const { user } = renderWithProviders(<CompanySearchPage />, { route: '/companies' });

    await user.type(screen.getByLabelText('Search companies'), 'Nonexistent Corp{Enter}');

    expect(await screen.findByText("We don't have this company yet.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add this company' })).toBeInTheDocument();
  });

  it('refuses to search for a signed-out visitor', async () => {
    renderWithProviders(<CompanySearchPage />, { route: '/companies?q=Northwind' });

    expect(await screen.findByText('Sign in to search companies.')).toBeInTheDocument();
  });
});
