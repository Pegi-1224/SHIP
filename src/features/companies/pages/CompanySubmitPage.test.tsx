/**
 * Submission form behaviour (spec 6.4, 6.5, 6.6, AC-7).
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { createSubmission, fetchSubmissionEligibility } from '../api/companiesApi';
import { CompanySubmitPage } from './CompanySubmitPage';

function renderForm(companyId: string, query = '') {
  return renderWithProviders(<CompanySubmitPage />, {
    route: `/companies/${companyId}/submit${query}`,
    path: '/companies/:companyId/submit',
  });
}

describe('CompanySubmitPage', () => {
  it('starts with every section switched off', async () => {
    await signInTestUser();
    renderForm('northwind-systems');

    expect(
      await screen.findByRole('heading', { name: /Share your data for Northwind Systems/ }),
    ).toBeInTheDocument();

    const toggles = screen.getAllByRole('switch');
    expect(toggles).toHaveLength(5);
    for (const toggle of toggles) expect(toggle).not.toBeChecked();
  });

  it('opens the section the user arrived from', async () => {
    await signInTestUser();
    renderForm('northwind-systems', '?area=maternity');

    const maternityToggle = await screen.findByRole('switch', {
      name: 'Include Paid maternity leave in your submission',
    });
    await waitFor(() => expect(maternityToggle).toBeChecked());
  });

  it('requires every field inside a section the user switched on', async () => {
    await signInTestUser();
    const { user } = renderForm('northwind-systems');

    await user.click(
      await screen.findByRole('switch', { name: 'Include Paid maternity leave in your submission' }),
    );
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Please enter a whole number of weeks.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Please enter a number between 0 and 100.')).toBeInTheDocument();
  });

  it('refuses to submit with nothing filled in', async () => {
    await signInTestUser();
    const { user } = renderForm('northwind-systems');

    await user.click(await screen.findByRole('button', { name: 'Submit' }));

    expect(
      await screen.findByText('Choose at least one section to fill in.'),
    ).toBeInTheDocument();
  });

  it('saves one section and leaves the others untouched', async () => {
    await signInTestUser({ email: 'submitter@example.com' });
    const { user } = renderForm('northwind-systems');

    await user.click(
      await screen.findByRole('switch', { name: 'Include Paid maternity leave in your submission' }),
    );
    await user.type(screen.getByLabelText('Weeks of paid leave'), '16');
    await user.type(screen.getByLabelText('Percent of salary paid'), '100');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(async () => {
      const eligibility = await fetchSubmissionEligibility('northwind-systems');
      expect(eligibility.existingSubmission?.sections.maternity).toEqual({
        paidWeeks: 16,
        payPercent: 100,
      });
      expect(eligibility.existingSubmission?.sections.salary).toBeUndefined();
    });
  });

  it('switches to editing when a submission already exists inside the 90-day window', async () => {
    await signInTestUser({ email: 'repeat.submitter@example.com' });
    await createSubmission('northwind-systems', {
      maternity: { paidWeeks: 12, payPercent: 80 },
    });

    renderForm('northwind-systems');

    expect(
      await screen.findByRole('heading', { name: /Edit your data for Northwind Systems/ }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText('You are editing your existing submission'),
    ).toBeInTheDocument();

    // The existing answers are loaded, not a blank form.
    await waitFor(() => expect(screen.getByLabelText('Weeks of paid leave')).toHaveValue('12'));
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('rejects a second submission inside the window at the API level', async () => {
    await signInTestUser({ email: 'window.test@example.com' });
    await createSubmission('northwind-systems', { maternity: { paidWeeks: 12, payPercent: 80 } });

    await expect(
      createSubmission('northwind-systems', { maternity: { paidWeeks: 14, payPercent: 90 } }),
    ).rejects.toThrow(/already shared data for this company in the last 90 days/);
  });

  it('keeps the values typed when saving fails', async () => {
    await signInTestUser({ email: 'failing.save@example.com' });

    server.use(
      http.post('/api/companies/:companyId/submissions', () =>
        HttpResponse.json(
          { code: 'server_error', message: 'Something went wrong. Please try again.' },
          { status: 503 },
        ),
      ),
    );

    const { user } = renderForm('northwind-systems');

    await user.click(
      await screen.findByRole('switch', { name: 'Include Paid maternity leave in your submission' }),
    );
    await user.type(screen.getByLabelText('Weeks of paid leave'), '18');
    await user.type(screen.getByLabelText('Percent of salary paid'), '90');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
    // Nothing the user entered was discarded.
    expect(screen.getByLabelText('Weeks of paid leave')).toHaveValue('18');
    expect(screen.getByLabelText('Percent of salary paid')).toHaveValue('90%');
  });

  it('shows an error instead of a form when the company does not exist', async () => {
    await signInTestUser();
    renderForm('does-not-exist');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We do not have this company yet.',
    );
  });
});
