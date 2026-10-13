import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { ComparePage } from './ComparePage';

function renderCompare(query: string) {
  return renderWithProviders(<ComparePage />, { route: `/compare${query}` });
}

describe('ComparePage', () => {
  it('asks for two companies before comparing', async () => {
    await signInTestUser();
    renderCompare('');

    expect(await screen.findByText('Choose two companies')).toBeInTheDocument();
  });

  it('generates a summary whose numbers match the table', async () => {
    await signInTestUser();
    renderCompare('?a=northwind-systems&b=lumen-health');

    // Northwind 168,000 vs Lumen 141,500 is a 19% gap. The sentence appears
    // twice on purpose - once in the summary, once on the metric card - and
    // the two must be identical (AC-4).
    const sentences = await screen.findAllByText(
      "Northwind Systems's average salary is 19% higher than Lumen Health's.",
    );
    expect(sentences).toHaveLength(2);

    // The same two figures appear in the text equivalent of the chart.
    expect(await screen.findByText('$168,000')).toBeInTheDocument();
    expect(await screen.findByText('$141,500')).toBeInTheDocument();
  });

  it('refuses to rank a global workforce share against a US one', async () => {
    await signInTestUser();
    renderCompare('?a=northwind-systems&b=cobalt-grid');

    expect(
      await screen.findAllByText(
        'These figures for women support and diversity are not directly comparable.',
      ),
    ).toHaveLength(2);
    expect(await screen.findByText(/different groups of people/)).toBeInTheDocument();
  });

  it('refuses to compare figures from different reporting periods', async () => {
    await signInTestUser();
    // Tidewater Labs reports FY2024 while Northwind reports FY2025.
    renderCompare('?a=northwind-systems&b=tidewater-labs');

    expect(
      await screen.findAllByText('These figures for salary are not directly comparable.'),
    ).toHaveLength(2);
  });

  it('falls back to user-reported salary when one company publishes none', async () => {
    await signInTestUser();
    // Aster Robotics has no public salary but five Senior Software Engineer reports.
    renderCompare('?a=northwind-systems&b=aster-robotics');

    expect(
      await screen.findByText(/Based on \d+ reports from Senior Software Engineers at both companies/),
    ).toBeInTheDocument();
  });

  it('describes benefit differences rather than ranking them', async () => {
    await signInTestUser();
    renderCompare('?a=northwind-systems&b=harborline-financial');

    expect(
      await screen.findByText(/Benefit lists are described, not ranked/),
    ).toBeInTheDocument();
  });
});
