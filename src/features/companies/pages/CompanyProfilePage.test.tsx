/**
 * Integration tests for the company profile.
 *
 * They drive the real page against the real mock backend, so what they verify
 * is the behaviour a user would see, not the shape of the component tree.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import { createSubmission } from '../api/companiesApi';
import { CompanyProfilePage } from './CompanyProfilePage';

function renderProfile(companyId: string) {
  return renderWithProviders(<CompanyProfilePage />, {
    route: `/companies/${companyId}`,
    path: '/companies/:companyId',
  });
}

describe('CompanyProfilePage', () => {
  it('shows the company and keeps public and user-reported data in separate sections', async () => {
    await signInTestUser();
    renderProfile('northwind-systems');

    expect(await screen.findByRole('heading', { name: 'Northwind Systems' })).toBeInTheDocument();

    // Both provenance labels appear, and more than once - once per metric area.
    const publicLabels = await screen.findAllByText('Public data');
    const userLabels = await screen.findAllByText('User reported');
    expect(publicLabels.length).toBeGreaterThan(1);
    expect(userLabels.length).toBeGreaterThan(1);

    // A source link the user can check.
    expect(
      await screen.findByRole('link', { name: /Northwind Systems Pay Transparency Report/ }),
    ).toBeInTheDocument();
  });

  it(`hides a user-reported aggregate below ${MIN_ELIGIBLE_CONTRIBUTORS} contributors`, async () => {
    await signInTestUser();
    // Harborline has exactly four salary submissions in the fixtures.
    renderProfile('harborline-financial');

    const salarySection = await screen.findByRole('region', { name: /^Salary$/ });

    expect(
      within(salarySection).getByText(
        new RegExp(`We show averages once ${MIN_ELIGIBLE_CONTRIBUTORS} people have contributed`),
      ),
    ).toBeInTheDocument();
    expect(within(salarySection).queryByText(/Median reported salary/)).not.toBeInTheDocument();
  });

  it('reveals the aggregate once a fifth person submits', async () => {
    await signInTestUser({ email: 'fifth.contributor@example.com' });

    const { queryClient } = renderProfile('harborline-financial');

    const salarySection = await screen.findByRole('region', { name: /^Salary$/ });
    expect(within(salarySection).queryByText(/Median reported salary/)).not.toBeInTheDocument();

    // A fifth distinct account submits salary data for this company.
    await createSubmission('harborline-financial', {
      salary: {
        role: 'Financial Analyst',
        level: 'Senior',
        city: 'New York, NY',
        annualSalaryUsd: 180_000,
      },
    });
    await queryClient.invalidateQueries();

    await waitFor(async () => {
      const refreshed = await screen.findByRole('region', { name: /^Salary$/ });
      expect(within(refreshed).getByText('Median reported salary')).toBeInTheDocument();
    });
  });

  it('shows a missing-data state with a share prompt when an area has nothing', async () => {
    await signInTestUser();
    // Palewave publishes no salary figure and has no submissions.
    renderProfile('palewave-media');

    const salarySection = await screen.findByRole('region', { name: /^Salary$/ });

    expect(within(salarySection).getByText('No data yet for salary.')).toBeInTheDocument();
    // One in the card header, one in the missing-data notice; both work.
    expect(
      within(salarySection).getAllByRole('button', { name: 'Share your data' }).length,
    ).toBeGreaterThan(0);
  });

  it('shows an error state with a retry control when the company does not exist', async () => {
    await signInTestUser();
    renderProfile('does-not-exist');

    expect(await screen.findByText('We do not have this company yet.')).toBeInTheDocument();
  });

  it('requires a session', async () => {
    renderProfile('northwind-systems');

    expect(await screen.findByText('Sign in to view company data.')).toBeInTheDocument();
  });
});
