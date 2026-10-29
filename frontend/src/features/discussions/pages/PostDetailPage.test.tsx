import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

async function commentsSection() {
  return within(await screen.findByRole('region', { name: /comments?$/ }));
}

describe('PostDetailPage', () => {
  it('shows the post with its author, details and tags', async () => {
    renderAt('/discussions/post_0001');

    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'How did you negotiate your first offer?',
      }),
    ).toBeInTheDocument();
    const post = screen.getByRole('article', { name: 'How did you negotiate your first offer?' });
    expect(within(post).getByText('Alice_122')).toBeInTheDocument();
    expect(within(post).getByText('Tech · Seattle')).toBeInTheDocument();
    expect(within(post).getByRole('link', { name: '#pay gap' })).toBeInTheDocument();
  });

  it('shows one comment box per comment, matching the count', async () => {
    renderAt('/discussions/post_0001');

    const comments = await commentsSection();
    expect(await comments.findByRole('heading', { name: '6 comments' })).toBeInTheDocument();
    expect(await comments.findAllByRole('article')).toHaveLength(6);
  });

  it('asks signed-out visitors to sign in before commenting', async () => {
    renderAt('/discussions/post_0001');

    expect(await screen.findByText('Sign in to join the conversation')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Add a comment' })).not.toBeInTheDocument();
  });

  it('adds a signed-in comment to the top of the list and updates the count', async () => {
    await signInTestUser();
    const { user } = renderAt('/discussions/post_0001');

    const input = await screen.findByRole('textbox', { name: 'Add a comment' });
    await user.type(input, 'This thread helped me a lot.');
    await user.click(screen.getByRole('button', { name: 'Post' }));

    const comments = await commentsSection();
    expect(await comments.findByRole('heading', { name: '7 comments' })).toBeInTheDocument();
    const [first] = comments.getAllByRole('article');
    expect(
      within(first as HTMLElement).getByText('This thread helped me a lot.'),
    ).toBeInTheDocument();
    expect(input).toHaveValue('');
  });

  it('says so when the post does not exist', async () => {
    renderAt('/discussions/post_9999');

    expect(await screen.findByText('We could not find that discussion.')).toBeInTheDocument();
  });

  it('opens from a Home preview card, and Back returns to Home', async () => {
    const { user } = renderAt('/');

    const column = await screen.findByRole('region', { name: '#pay gap' });
    const [firstCard] = await within(column).findAllByRole('link');
    await user.click(firstCard as HTMLElement);

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Back/ }));

    expect(await screen.findByRole('heading', { name: 'Latest discussions' })).toBeInTheDocument();
  });
});
