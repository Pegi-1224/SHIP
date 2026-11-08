import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { AppRoutes } from '@/app/router/AppRoutes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

const back = () => screen.getByRole('button', { name: 'Back' });
const next = () => screen.getByRole('button', { name: 'Next' });

describe('WelcomeTourPage', () => {
  it('walks through the three features, then opens the assessment', async () => {
    await signInTestUser({ assessment: null });
    const { user } = renderAt('/welcome');

    expect(await screen.findByRole('heading', { name: 'Look up any company' })).toBeInTheDocument();
    expect(screen.getByText('Feature 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('Sample company for illustration')).toBeInTheDocument();
    expect(back()).toBeDisabled();

    await user.click(next());
    expect(screen.getByRole('heading', { name: 'Side By Side Comparisons' })).toHaveFocus();
    expect(screen.getByText('Feature 2 of 3')).toBeInTheDocument();

    await user.click(back());
    expect(screen.getByRole('heading', { name: 'Look up any company' })).toBeInTheDocument();

    await user.click(next());
    await user.click(next());
    expect(screen.getByRole('heading', { name: 'Discuss with Others' })).toBeInTheDocument();
    expect(screen.getByText('Sample discussion for illustration')).toBeInTheDocument();

    await user.click(next());
    expect(
      await screen.findByRole('heading', { name: 'Personalize your SHIP' }),
    ).toBeInTheDocument();
  });
});
