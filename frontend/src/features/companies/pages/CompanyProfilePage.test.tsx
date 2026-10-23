import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { CompanyProfilePage } from './CompanyProfilePage';

function renderCompany(companyId: string) {
  return renderWithProviders(<CompanyProfilePage />, {
    route: `/companies/${companyId}`,
    path: '/companies/:companyId',
  });
}

async function box(name: string) {
  return within(await screen.findByRole('region', { name }));
}

describe('CompanyProfilePage', () => {
  it('shows public and user-reported salary side by side', async () => {
    renderCompany('lumen-harbor-analytics');

    const salary = await box('Salary');
    expect(salary.getByText('$128,000')).toBeInTheDocument();
    expect(salary.getByText('$121,000')).toBeInTheDocument();
    expect(salary.getByText('User reported from 12 submissions')).toBeInTheDocument();
  });

  it('fills the promotion and diversity boxes', async () => {
    renderCompany('lumen-harbor-analytics');

    const promotion = await box('Promotion & leadership');
    expect(promotion.getByText('40%')).toBeInTheDocument();
    expect(promotion.getByText('22 mo')).toBeInTheDocument();
    expect(promotion.getByText('Time to promotion from 9 submissions')).toBeInTheDocument();

    const diversity = await box('Women support & diversity');
    expect(diversity.getByText('44%')).toBeInTheDocument();
    expect(diversity.getByText('Have a woman manager')).toBeInTheDocument();
    expect(diversity.getByText('72%')).toBeInTheDocument();
    expect(diversity.getByText('User reported from 8 submissions')).toBeInTheDocument();
  });

  it('shows the maternity leave and benefits boxes', async () => {
    renderCompany('lumen-harbor-analytics');

    const leave = await box('Paid maternity leave');
    expect(leave.getByText('16wk')).toBeInTheDocument();
    expect(leave.getByText('15wk')).toBeInTheDocument();
    expect(leave.getByText('95%')).toBeInTheDocument();
    expect(leave.getByText('User reported from 6 submissions')).toBeInTheDocument();

    const benefits = await box('Welfare benefits');
    const published = within(benefits.getByRole('list', { name: 'Public benefits' }));
    expect(published.getByText('Dental and vision')).toBeInTheDocument();
    const reported = within(benefits.getByRole('list', { name: 'User-reported benefits' }));
    expect(reported.getByText('Mental health support')).toBeInTheDocument();
  });

  it('says when there is no public salary or no promotion data', async () => {
    renderCompany('marigold-mobility');

    const salary = await box('Salary');
    expect(salary.getByText('Not published')).toBeInTheDocument();
    expect(salary.getByText('$84,000')).toBeInTheDocument();

    const promotion = await box('Promotion & leadership');
    expect(promotion.getByText('No public promotion data yet')).toBeInTheDocument();

    const diversity = await box('Women support & diversity');
    expect(diversity.getByText('No data yet')).toBeInTheDocument();
    expect(
      diversity.getByRole('button', { name: 'Be the first to report women support & diversity' }),
    ).toBeInTheDocument();
  });

  it('withholds user-reported numbers below the privacy threshold', async () => {
    renderCompany('kestrel-cloudworks');

    const diversity = await box('Women support & diversity');
    expect(diversity.getByText('Not enough data yet')).toBeInTheDocument();
    expect(
      diversity.getByText('Numbers show once 5 people report (3 so far).'),
    ).toBeInTheDocument();
    expect(diversity.queryByText('Have a woman manager')).not.toBeInTheDocument();
    expect(diversity.getByRole('button', { name: /^Add yours/ })).toBeInTheDocument();
  });

  it('offers "Be the first" in every box when there is only public data', async () => {
    renderCompany('juniper-atlas-energy');

    await screen.findByRole('heading', { level: 1, name: 'Juniper Atlas Energy' });
    expect(screen.getAllByText('No data yet')).toHaveLength(5);
    expect(screen.getAllByRole('button', { name: /^Be the first/ })).toHaveLength(5);
    expect((await box('Paid maternity leave')).getByText('24wk')).toBeInTheDocument();
  });

  it('shows user reports when nothing is published', async () => {
    renderCompany('wrenfield-studios');

    const salary = await box('Salary');
    expect(salary.getByText('Not published')).toBeInTheDocument();
    expect(salary.getByText('$97,000')).toBeInTheDocument();

    const leave = await box('Paid maternity leave');
    expect(leave.getByText('Not published')).toBeInTheDocument();
    expect(leave.getByText('12wk')).toBeInTheDocument();

    const benefits = await box('Welfare benefits');
    expect(benefits.getByText('None published')).toBeInTheDocument();
    expect(benefits.getByText('Flexible hours')).toBeInTheDocument();
    expect(screen.queryByText('No data yet')).not.toBeInTheDocument();
  });

  it('adds a report and updates the box', async () => {
    const user = userEvent.setup();
    renderCompany('lumen-harbor-analytics');

    const leave = await box('Paid maternity leave');
    await user.click(leave.getByRole('button', { name: 'Add yours to paid maternity leave' }));

    const dialog = within(
      await screen.findByRole('dialog', { name: 'Report paid maternity leave' }),
    );
    await user.type(dialog.getByRole('textbox', { name: /Paid weeks/ }), '29');
    await user.type(dialog.getByRole('textbox', { name: /Pay during leave/ }), '60');
    await user.click(dialog.getByRole('button', { name: 'Submit report' }));

    // (15 x 6 + 29) / 7 = 17 weeks and (95 x 6 + 60) / 7 = 90%.
    expect(await leave.findByText('User reported from 7 submissions')).toBeInTheDocument();
    expect(leave.getByText('17wk')).toBeInTheDocument();
    expect(leave.getByText('90%')).toBeInTheDocument();
  });

  it('keeps a first report private until enough people report', async () => {
    const user = userEvent.setup();
    renderCompany('juniper-atlas-energy');

    const benefits = await box('Welfare benefits');
    await user.click(
      benefits.getByRole('button', { name: 'Be the first to report welfare benefits' }),
    );

    const dialog = within(await screen.findByRole('dialog', { name: 'Report welfare benefits' }));
    await user.click(dialog.getByRole('checkbox', { name: 'Fertility support' }));
    await user.click(dialog.getByRole('button', { name: 'Submit report' }));

    expect(await benefits.findByText('Not enough data yet')).toBeInTheDocument();
    expect(benefits.getByText('Numbers show once 5 people report (1 so far).')).toBeInTheDocument();
  });

  it('checks the form before sending it', async () => {
    const user = userEvent.setup();
    renderCompany('juniper-atlas-energy');

    const salary = await box('Salary');
    await user.click(salary.getByRole('button', { name: 'Be the first to report salary' }));

    const dialog = within(await screen.findByRole('dialog', { name: 'Report your salary' }));
    await user.click(dialog.getByRole('button', { name: 'Submit report' }));
    expect(dialog.getByText('Enter your annual base salary.')).toBeInTheDocument();

    await user.type(dialog.getByRole('textbox', { name: /annual base salary/ }), '500');
    await user.click(dialog.getByRole('button', { name: 'Submit report' }));
    expect(dialog.getByText('Enter a number from 10,000 to 1,000,000.')).toBeInTheDocument();
  });

  it('shows a not-found message for an unknown company', async () => {
    renderCompany('no-such-company');
    expect(await screen.findByText('Company not found')).toBeInTheDocument();
  });
});
