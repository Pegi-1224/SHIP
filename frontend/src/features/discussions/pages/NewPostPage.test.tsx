import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { AppRoutes } from '@/app/router/AppRoutes';

function renderAt(route: string) {
  return renderWithProviders(<AppRoutes />, { route });
}

const NOT_ALLOWED = /contains a word that isn’t allowed/;

describe('NewPostPage', () => {
  it('opens from "+ New post" and has no header search bar', async () => {
    const { user } = renderAt('/discussions');
    // Let the feed finish loading, so no request is still in flight when the test ends.
    await screen.findByText('25 posts');
    await user.click(screen.getByRole('link', { name: '+ New post' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Start a discussion' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Search/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
  });

  it('flags a banned word in the title, post and new tag as it is typed', async () => {
    await signInTestUser();
    const { user } = renderAt('/discussions/new');

    const title = await screen.findByRole('textbox', { name: 'Title' });
    await user.type(title, 'You idiot');
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(
      screen.getByText('This title contains a word that isn’t allowed. Please change it.'),
    ).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Your post' }), 'Click here now');
    expect(
      screen.getByText('This post contains a word that isn’t allowed. Please change it.'),
    ).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Create a new tag' }), 'spamword');
    expect(
      screen.getByText('This tag contains a word that isn’t allowed. Please change it.'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.queryByRole('button', { name: '#spamword' })).not.toBeInTheDocument();

    // Whole words only: "skill" is not "kill", "dumbbell" is not "dumb".
    await user.clear(title);
    await user.type(title, 'Dumbbell skills at work');
    expect(title).not.toHaveAttribute('aria-invalid');
    expect(screen.getAllByText(NOT_ALLOWED)).toHaveLength(2);
  });

  it('needs a title, a post and at least one tag', async () => {
    await signInTestUser();
    const { user } = renderAt('/discussions/new');

    // Post stays disabled until the session has loaded.
    const post = await screen.findByRole('button', { name: 'Post' });
    await waitFor(() => expect(post).toBeEnabled());
    await user.click(post);

    expect(screen.getByText('Add a title so people know what this is about.')).toBeInTheDocument();
    expect(screen.getByText('Write something before posting.')).toBeInTheDocument();
    expect(screen.getByText('Pick at least 1 tag.')).toBeInTheDocument();
  });

  it('publishes the post with a new tag and opens it, then lets the author edit it', async () => {
    await signInTestUser();
    const { user } = renderAt('/discussions/new');

    await user.type(await screen.findByRole('textbox', { name: 'Title' }), 'Four-day weeks?');
    await user.type(
      screen.getByRole('textbox', { name: 'Your post' }),
      'Has anyone worked somewhere with a four-day week?',
    );
    const tags = within(screen.getByRole('group', { name: 'Tags (at least 1)' }));
    await user.click(tags.getByRole('button', { name: '#career goals' }));
    expect(tags.getByRole('button', { name: '#career goals' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.type(screen.getByRole('textbox', { name: 'Create a new tag' }), 'Work Life{Enter}');
    expect(tags.getByRole('button', { name: '#work life' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Post' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Four-day weeks?' }),
    ).toBeInTheDocument();
    const post = screen.getByRole('article', { name: 'Four-day weeks?' });
    expect(within(post).getByText('Anonymous')).toBeInTheDocument();
    expect(within(post).getByRole('link', { name: '#work life' })).toBeInTheDocument();

    await user.click(within(post).getByRole('link', { name: 'Edit' }));
    const title = await screen.findByRole('textbox', { name: 'Title' });
    expect(title).toHaveValue('Four-day weeks?');
    await user.clear(title);
    await user.type(title, 'Four-day weeks: worth it?');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Four-day weeks: worth it?' }),
    ).toBeInTheDocument();
  });

  it('does not show Edit on someone else’s post', async () => {
    await signInTestUser();
    renderAt('/discussions/post_0001');

    const post = await screen.findByRole('article', {
      name: 'How did you negotiate your first offer?',
    });
    expect(within(post).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument();
  });
});
