/**
 * Profile and account deletion (spec 3.6, 3.9, AC-9).
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { getAuthToken } from '@/shared/api';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import { createPost } from '@/features/discussions';
import { createSubmission, fetchCompanyProfile } from '@/features/companies';
import { ProfilePage } from './ProfilePage';

describe('ProfilePage', () => {
  it('shows account details and the anonymous name other people see', async () => {
    await signInTestUser({ email: 'profile.user@example.com' });
    renderWithProviders(<ProfilePage />, { route: '/profile' });

    expect(await screen.findByText('profile.user@example.com')).toBeInTheDocument();
    expect(await screen.findByText(/^Anonymous [A-Z]/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retake assessment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
  });

  it('lists the posts the user wrote', async () => {
    await signInTestUser();
    await createPost({ title: 'Something I wrote', body: 'Body text.', tags: ['career goals'] });

    renderWithProviders(<ProfilePage />, { route: '/profile' });

    expect(
      await screen.findByRole('heading', { level: 3, name: 'Something I wrote' }),
    ).toBeInTheDocument();
  });

  it('requires the confirmation word before deleting is possible', async () => {
    await signInTestUser();
    const { user } = renderWithProviders(<ProfilePage />, { route: '/profile' });

    await user.click(await screen.findByRole('button', { name: 'Delete my account' }));

    const confirmButton = await screen.findByRole('button', { name: 'Delete everything' });
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText('Type DELETE above to enable this button.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
    expect(confirmButton).toBeEnabled();
  });

  it('clears the session and recomputes company aggregates after deletion', async () => {
    // This account is the fifth salary contributor for Harborline, which pushes
    // the aggregate above the privacy threshold.
    await signInTestUser({ email: 'leaving.user@example.com' });
    await createSubmission('harborline-financial', {
      salary: {
        role: 'Financial Analyst',
        level: 'Senior',
        city: 'New York, NY',
        annualSalaryUsd: 175_000,
      },
    });

    const before = await fetchCompanyProfile('harborline-financial');
    expect(before.userReported.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS);
    expect(before.userReported.salary.summary).not.toBeNull();

    const { user } = renderWithProviders(<ProfilePage />, { route: '/profile' });

    await user.click(await screen.findByRole('button', { name: 'Delete my account' }));
    await user.type(await screen.findByLabelText('Type DELETE to confirm'), 'DELETE');
    await user.click(screen.getByRole('button', { name: 'Delete everything' }));

    // The local credential is dropped, so nothing can be fetched as this user.
    await waitFor(() => expect(getAuthToken()).toBeNull());

    // Look at the company as somebody else: the contribution is gone, so the
    // aggregate drops back below the threshold and the numbers stop being
    // published (spec 6.6, T2).
    await signInTestUser({ email: 'observer@example.com' });
    const after = await fetchCompanyProfile('harborline-financial');
    expect(after.userReported.salary.eligibleContributors).toBe(MIN_ELIGIBLE_CONTRIBUTORS - 1);
    expect(after.userReported.salary.summary).toBeNull();
  });
});
