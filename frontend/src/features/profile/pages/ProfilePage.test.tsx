import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { AppRoutes } from '@/app/router/AppRoutes';
import { createDemoComment, createDemoPost } from '@/features/discussions';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';

function renderProfile() {
  return renderWithProviders(<AppRoutes />, { route: '/profile' });
}

async function stat(label: string) {
  const item = (await screen.findByText(label)).closest('li');
  if (!item) throw new Error(`No stat called ${label}`);
  return within(item);
}

describe('ProfilePage', () => {
  it('shows the name, the hidden email and the real activity counts', async () => {
    await signInTestUser();
    const { post } = await createDemoPost({
      title: 'How do you ask about pay bands?',
      content: 'I have an offer and want to ask about the band without sounding rude.',
      tags: ['pay gap'],
    });
    await createDemoComment(post.id, 'Following this one.');

    renderProfile();

    expect(await screen.findByRole('heading', { name: 'test.user' })).toBeInTheDocument();
    expect(screen.getByText('Only visible to you')).toBeInTheDocument();
    expect(screen.getByText('t••••@example.com')).toBeInTheDocument();
    expect(screen.queryByText('test.user@example.com')).not.toBeInTheDocument();

    expect(await (await stat('Posts & comments')).findByText('2')).toBeInTheDocument();
    expect((await stat('Companies shared')).getByText('0')).toBeInTheDocument();
    // DEFAULT_TEST_ASSESSMENT follows two topics.
    expect(await (await stat('Topics you follow')).findByText('2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retake assessment' })).toHaveAttribute(
      'href',
      '/assessment',
    );
  });

  it('opens the list of the user’s own posts and comments', async () => {
    await signInTestUser();
    await createDemoPost({
      title: 'Asking for a flexible schedule',
      content: 'How did you bring up flexible hours with your manager the first time?',
      tags: ['work-life balance'],
    });
    const { user } = renderProfile();

    const toggle = await screen.findByRole('button', { name: /My posts & comments/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      await screen.findByRole('link', { name: /Asking for a flexible schedule/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('deletes the account only after the user confirms they understand', async () => {
    await signInTestUser();
    const { user } = renderProfile();

    await user.click(await screen.findByRole('button', { name: /Delete account/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' });
    const confirm = within(dialog).getByRole('button', { name: 'Delete account' });
    expect(confirm).toBeDisabled();

    await user.click(within(dialog).getByLabelText('I understand this can’t be undone'));
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    // Signed out and back on Home.
    expect(await screen.findByRole('heading', { name: 'Latest discussions' })).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Delete your account?' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('cancelling leaves the account alone', async () => {
    await signInTestUser();
    const { user } = renderProfile();

    await user.click(await screen.findByRole('button', { name: /Delete account/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Delete your account?' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'test.user' })).toBeInTheDocument();
  });
});
