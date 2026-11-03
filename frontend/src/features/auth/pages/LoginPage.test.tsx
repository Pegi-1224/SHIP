import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { AppRoutes } from '@/app/router/AppRoutes';
import { clearAuthToken } from '@/shared/api';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

/** Types an address, asks for a code, and returns the code the (mock) server handed back. */
async function requestCode(user: UserEvent, email: string): Promise<string> {
  await user.type(await screen.findByLabelText(/email address/i), email);
  await user.click(screen.getByRole('button', { name: 'Send verification code' }));
  const code = await screen.findByText(/^\d{6}$/);
  return code.textContent ?? '';
}

async function enterCode(user: UserEvent, code: string) {
  const [first] = screen.getAllByRole('textbox');
  if (!first) throw new Error('No code input on screen');
  await user.click(first);
  await user.keyboard(code);
}

const ELIGIBILITY = /I am a woman aged 18 or older/;

describe('LoginPage', () => {
  it('asks for the declaration and an email address', async () => {
    renderAt('/login');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Sign in or create an account' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: ELIGIBILITY })).not.toBeChecked();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('rejects an invalid address before asking the server', async () => {
    const { user } = renderAt('/login');

    await user.type(await screen.findByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Send verification code' }));

    expect(
      await screen.findByText('Enter a valid email address, for example you@example.com.'),
    ).toBeInTheDocument();
  });

  it('creates an account and sends a new user to the assessment', async () => {
    const { user } = renderAt('/login');

    await user.click(await screen.findByRole('checkbox', { name: ELIGIBILITY }));
    const code = await requestCode(user, 'new.person@example.com');
    await enterCode(user, code);
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByRole('heading', { name: 'Personalize your SHIP' })).toBeInTheDocument();
  });

  it('asks a new user to confirm the declaration, then lets them continue', async () => {
    const { user } = renderAt('/login');

    const code = await requestCode(user, 'new.person@example.com');
    await enterCode(user, code);
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    // The server decides this is a new account, so the checkbox is what turns red.
    expect(await screen.findAllByText('Please confirm to create your account.')).not.toHaveLength(0);
    expect(screen.queryByRole('heading', { name: 'Personalize your SHIP' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: ELIGIBILITY }));
    expect(screen.queryByText('Please confirm to create your account.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByRole('heading', { name: 'Personalize your SHIP' })).toBeInTheDocument();
  });

  it('shows the server message for a wrong code and stays on the page', async () => {
    const { user } = renderAt('/login');

    await user.click(await screen.findByRole('checkbox', { name: ELIGIBILITY }));
    await requestCode(user, 'new.person@example.com');
    await enterCode(user, '000000');
    await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

    expect(await screen.findByText('That code is not correct.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in or create an account' })).toBeInTheDocument();
  });

  it('keeps the typed address when going back to change it', async () => {
    const { user } = renderAt('/login');

    await requestCode(user, 'typo@example.com');
    await user.click(screen.getByRole('button', { name: 'Use a different email' }));

    expect(await screen.findByLabelText(/email address/i)).toHaveValue('typo@example.com');
  });

  describe('for an existing account', () => {
    async function existingAccountSignedOut(email: string) {
      await signInTestUser({ email });
      clearAuthToken();
    }

    it('signs in without the declaration and returns to the page they were headed for', async () => {
      await existingAccountSignedOut('returning@example.com');
      const { user } = renderAt('/login?redirectTo=%2Fprofile');

      const code = await requestCode(user, 'returning@example.com');
      await enterCode(user, code);
      await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

      expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    });

    it('goes Home when there is no page to return to', async () => {
      await existingAccountSignedOut('returning@example.com');
      const { user } = renderAt('/login');

      const code = await requestCode(user, 'returning@example.com');
      await enterCode(user, code);
      await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

      expect(
        await screen.findByRole('heading', { name: 'Latest discussions' }),
      ).toBeInTheDocument();
    });

    it('does not follow a redirectTo that points at another site', async () => {
      await existingAccountSignedOut('returning@example.com');
      const { user } = renderAt('/login?redirectTo=%2F%2Fevil.example');

      const code = await requestCode(user, 'returning@example.com');
      await enterCode(user, code);
      await user.click(screen.getByRole('button', { name: 'Verify and continue' }));

      expect(
        await screen.findByRole('heading', { name: 'Latest discussions' }),
      ).toBeInTheDocument();
    });
  });

  describe('Google demo button (mock mode only)', () => {
    it('needs the declaration for a new account', async () => {
      const { user } = renderAt('/login');

      await user.click(
        await screen.findByRole('button', { name: 'Continue with Google (demo account)' }),
      );

      await waitFor(() =>
        expect(screen.getByText('Please confirm to create your account.')).toBeInTheDocument(),
      );
    });

    it('signs into the demo account once the declaration is ticked', async () => {
      const { user } = renderAt('/login');

      await user.click(await screen.findByRole('checkbox', { name: ELIGIBILITY }));
      await user.click(screen.getByRole('button', { name: 'Continue with Google (demo account)' }));

      expect(await screen.findByRole('heading', { name: 'Personalize your SHIP' })).toBeInTheDocument();
    });
  });
});
