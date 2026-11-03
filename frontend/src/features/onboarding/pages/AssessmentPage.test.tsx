import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { AppRoutes } from '@/app/router/AppRoutes';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { fetchMyAssessment } from '../api/assessmentApi';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

const next = () => screen.getByRole('button', { name: 'Next' });

async function question(title: string | RegExp) {
  return screen.findByRole('heading', { level: 2, name: title });
}

/** Answers question 1-4 with one sensible choice each, leaving the user on question 5. */
async function answerFirstFour(user: UserEvent) {
  await question(/Where are you in your career/);
  await user.click(screen.getByRole('radio', { name: 'Employed and looking to switch' }));
  await user.click(next());

  await question(/Which industries/);
  await user.click(screen.getByRole('checkbox', { name: 'Tech' }));
  await user.click(next());

  await question(/What matters most/);
  await user.click(screen.getByRole('checkbox', { name: 'Pay equity' }));
  await user.click(next());

  await question(/Which topics/);
  await user.click(screen.getByRole('checkbox', { name: '#pay gap' }));
  await user.click(next());

  await question(/companies you want to follow/);
}

describe('AssessmentPage', () => {
  it('sends a signed-out visitor to sign in first', async () => {
    renderAt('/assessment');

    expect(
      await screen.findByRole('heading', { name: 'Sign in or create an account' }),
    ).toBeInTheDocument();
  });

  describe('first time (a new account)', () => {
    it('shows one question at a time with its progress', async () => {
      await signInTestUser({ assessment: null });
      renderAt('/assessment');

      expect(await question(/Where are you in your career/)).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
      expect(screen.getAllByRole('radio')).toHaveLength(4);
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
    });

    it('does not move on until the question is answered', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await question(/Where are you in your career/);
      await user.click(next());

      expect(await screen.findByText('Choose where you are right now.')).toBeInTheDocument();
      expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
    });

    it('requires at least one industry, priority and topic', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await question(/Where are you in your career/);
      await user.click(screen.getByRole('radio', { name: 'Employed and staying' }));
      await user.click(next());

      await question(/Which industries/);
      await user.click(next());
      expect(await screen.findByText('Choose at least one industry.')).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'Finance' }));
      await user.click(next());

      await question(/What matters most/);
      await user.click(next());
      expect(
        await screen.findByText('Choose at least one thing that matters to you.'),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'Benefits' }));
      await user.click(next());

      await question(/Which topics/);
      await user.click(next());
      expect(await screen.findByText('Choose at least one topic.')).toBeInTheDocument();
    });

    it('stops at three priorities and frees a slot when one is unticked', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await question(/Where are you in your career/);
      await user.click(screen.getByRole('radio', { name: 'Employed and staying' }));
      await user.click(next());
      await question(/Which industries/);
      await user.click(screen.getByRole('checkbox', { name: 'Tech' }));
      await user.click(next());
      await question(/What matters most/);

      for (const name of ['Pay equity', 'Benefits', 'Safe workplace']) {
        await user.click(screen.getByRole('checkbox', { name }));
      }
      expect(screen.getByText('3 of 3 chosen')).toBeInTheDocument();

      // A fourth is inert to the mouse (the click is refused outright)...
      const fourth = screen.getByRole('checkbox', { name: 'Work-life balance' });
      expect(fourth).toHaveStyle({ pointerEvents: 'none' });
      expect(fourth).toHaveAttribute('aria-disabled', 'true');
      // ...and the keyboard cannot add it either.
      fourth.focus();
      await user.keyboard(' ');
      expect(fourth).not.toBeChecked();
      expect(screen.getByText('3 of 3 chosen')).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: 'Benefits' }));
      expect(screen.getByText('2 of 3 chosen')).toBeInTheDocument();
      await user.click(screen.getByRole('checkbox', { name: 'Work-life balance' }));
      expect(screen.getByRole('checkbox', { name: 'Work-life balance' })).toBeChecked();
    });

    it('keeps earlier answers when going back', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await question(/Where are you in your career/);
      await user.click(screen.getByRole('radio', { name: 'Looking for a full-time role' }));
      await user.click(next());
      await question(/Which industries/);

      await user.click(screen.getByRole('button', { name: 'Back' }));

      expect(await question(/Where are you in your career/)).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Looking for a full-time role' })).toBeChecked();
    });

    it('lets the last question be skipped, saves the answers and goes Home', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await answerFirstFour(user);
      expect(screen.getByText('Question 5 of 5 · optional')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Finish' }));

      expect(await screen.findByRole('heading', { name: 'Latest discussions' })).toBeInTheDocument();

      const saved = await fetchMyAssessment();
      expect(saved?.answers).toEqual({
        stage: 'employed_looking_to_switch',
        industries: ['Tech'],
        priorities: ['pay_equity'],
        topics: ['pay gap'],
        followedCompanyIds: [],
      });
      expect(saved?.updatedAt).toBeNull();
    });

    it('can follow a company found by search, and unfollow it again', async () => {
      await signInTestUser({ assessment: null });
      const { user } = renderAt('/assessment');

      await answerFirstFour(user);
      await user.type(screen.getByLabelText('Search a company'), 'northwind{Enter}');
      await user.click(await screen.findByRole('button', { name: 'Select' }));

      const following = await screen.findByText('Following (1)');
      expect(within(following.parentElement as HTMLElement).getByText('Northwind Systems')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Stop following Northwind Systems' }));
      expect(screen.queryByText('Following (1)')).not.toBeInTheDocument();

      await user.click(await screen.findByRole('button', { name: 'Select' }));
      await user.click(screen.getByRole('button', { name: 'Finish' }));
      await screen.findByRole('heading', { name: 'Latest discussions' });

      expect((await fetchMyAssessment())?.answers.followedCompanyIds).toEqual(['northwind-systems']);
    });
  });

  describe('retaking it (an account that already finished)', () => {
    it('pre-fills the saved answers and says it is an update', async () => {
      await signInTestUser();
      const { user } = renderAt('/assessment');

      expect(await screen.findByText(/Update your answers/)).toBeInTheDocument();
      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: 'Employed and looking to switch' }),
        ).toBeChecked(),
      );

      await user.click(next());
      await question(/Which industries/);
      expect(screen.getByRole('checkbox', { name: 'Tech' })).toBeChecked();
    });

    it('saves the changes, marks it updated and returns to Profile', async () => {
      await signInTestUser();
      const { user } = renderAt('/assessment');

      await waitFor(() =>
        expect(
          screen.getByRole('radio', { name: 'Employed and looking to switch' }),
        ).toBeChecked(),
      );
      await user.click(screen.getByRole('radio', { name: 'Employed and staying' }));
      for (let index = 0; index < 4; index += 1) await user.click(next());
      await user.click(await screen.findByRole('button', { name: 'Save my answers' }));

      expect(await screen.findByRole('heading', { name: 'Profile' })).toBeInTheDocument();

      const saved = await fetchMyAssessment();
      expect(saved?.answers.stage).toBe('employed_and_staying');
      expect(saved?.updatedAt).not.toBeNull();
    });

    it('shows the names of companies already followed', async () => {
      await signInTestUser({
        assessment: {
          stage: 'employed_and_staying',
          industries: ['Tech'],
          priorities: ['benefits'],
          topics: ['pay gap'],
          followedCompanyIds: ['northwind-systems'],
        },
      });
      const { user } = renderAt('/assessment');

      await waitFor(() => expect(screen.getByRole('radio', { name: 'Employed and staying' })).toBeChecked());
      for (let index = 0; index < 4; index += 1) await user.click(next());

      expect(await screen.findByText('Following (1)')).toBeInTheDocument();
      expect(await screen.findByText('Northwind Systems')).toBeInTheDocument();
    });
  });
});
