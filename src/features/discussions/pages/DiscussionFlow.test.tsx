/**
 * Discussion flows: write a post, comment on it, and keep input on failure.
 */
import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { screen, waitFor } from '@testing-library/react';
import { server } from '@/mocks/server';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { createPost } from '../api/discussionsApi';
import { DiscussionsPage } from './DiscussionsPage';
import { NewPostPage } from './NewPostPage';
import { PostDetailPage } from './PostDetailPage';

describe('DiscussionsPage', () => {
  it('lists posts newest first', async () => {
    await signInTestUser();
    renderWithProviders(<DiscussionsPage />, { route: '/discussions' });

    // Each post card is an <article> with its title as a level-3 heading.
    const titles = await screen.findAllByRole('heading', { level: 3 });
    expect(titles[0]).toHaveTextContent('How did you find out you were underpaid?');
    expect(titles[1]).toHaveTextContent('Manager asked me to "wait a cycle" for promotion again');
  });

  it('filters by tag from the URL', async () => {
    await signInTestUser();
    renderWithProviders(<DiscussionsPage />, { route: '/discussions?tag=maternity leave' });

    expect(
      await screen.findByRole('link', { name: /Returning from maternity leave/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: 'Counter-offer went badly - a warning' }),
    ).not.toBeInTheDocument();
  });

  it('refuses to list posts for a signed-out visitor', async () => {
    renderWithProviders(<DiscussionsPage />, { route: '/discussions' });

    expect(await screen.findByText('Sign in to browse discussions.')).toBeInTheDocument();
  });
});

describe('NewPostPage', () => {
  it('requires a tag before publishing', async () => {
    await signInTestUser();
    const { user } = renderWithProviders(<NewPostPage />, { route: '/discussions/new' });

    await user.type(screen.getByLabelText(/^Title/), 'A question about levelling');
    await user.type(screen.getByLabelText(/^Your post/), 'How do you ask for the criteria?');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(
      await screen.findByText('Add at least 1 tag so people can find this.'),
    ).toBeInTheDocument();
  });

  it('keeps everything typed when publishing fails, and succeeds on retry', async () => {
    await signInTestUser();

    // Fail the first publish only.
    let attempts = 0;
    server.use(
      http.post('/api/discussions/posts', async ({ request }) => {
        attempts += 1;
        if (attempts === 1) {
          return HttpResponse.json(
            { code: 'server_error', message: 'Something went wrong. Please try again.' },
            { status: 503 },
          );
        }
        const body = await request.json();
        return HttpResponse.json(
          {
            id: 'post_new',
            ...(body as object),
            author: { id: 'anon_1', label: 'Anonymous Finch', color: '#7c40b6' },
            isOwn: true,
            createdAt: new Date().toISOString(),
            editedAt: null,
            commentCount: 0,
          },
          { status: 201 },
        );
      }),
    );

    const { user } = renderWithProviders(<NewPostPage />, { route: '/discussions/new' });

    await user.type(screen.getByLabelText(/^Title/), 'Negotiating a level, not a number');
    await user.type(
      screen.getByLabelText(/^Your post/),
      'The band mattered more than the offer in the end.',
    );
    await user.type(screen.getByRole('combobox', { name: 'Tag name' }), 'negotiation');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    // The failure is shown...
    expect(await screen.findByText('Something went wrong')).toBeInTheDocument();

    // ...and nothing the user typed was thrown away.
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Negotiating a level, not a number');
    expect(screen.getByLabelText(/^Your post/)).toHaveValue(
      'The band mattered more than the offer in the end.',
    );
    expect(screen.getByText('#negotiation')).toBeInTheDocument();

    // Retrying submits the same values and succeeds.
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(attempts).toBe(2));
  });
});

describe('PostDetailPage', () => {
  it('shows a post and lets the author edit or delete it', async () => {
    await signInTestUser();
    const post = await createPost({
      title: 'My own post',
      body: 'Something I wrote.',
      tags: ['career goals'],
    });

    renderWithProviders(<PostDetailPage />, {
      route: `/discussions/${post.id}`,
      path: '/discussions/:postId',
    });

    expect(await screen.findByRole('heading', { name: 'My own post' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it("hides edit and delete on someone else's post", async () => {
    await signInTestUser();

    renderWithProviders(<PostDetailPage />, {
      route: '/discussions/post_seed_1',
      path: '/discussions/:postId',
    });

    expect(
      await screen.findByRole('heading', { name: 'How did you find out you were underpaid?' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting, then deletes', async () => {
    await signInTestUser();
    const post = await createPost({
      title: 'Post to delete',
      body: 'Temporary.',
      tags: ['career goals'],
    });

    const { user } = renderWithProviders(<PostDetailPage />, {
      route: `/discussions/${post.id}`,
      path: '/discussions/:postId',
    });

    await user.click(await screen.findByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Delete this post?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Delete post' }));

    await waitFor(() =>
      expect(screen.queryByText('Delete this post?')).not.toBeInTheDocument(),
    );
  });

  it('posts a comment and shows it', async () => {
    await signInTestUser();
    const post = await createPost({
      title: 'A post to comment on',
      body: 'Please reply.',
      tags: ['career goals'],
    });

    const { user } = renderWithProviders(<PostDetailPage />, {
      route: `/discussions/${post.id}`,
      path: '/discussions/:postId',
    });

    await user.type(
      await screen.findByLabelText('Add a comment'),
      'This matched my experience exactly.',
    );
    await user.click(screen.getByRole('button', { name: 'Post comment' }));

    expect(
      await screen.findByText('This matched my experience exactly.'),
    ).toBeInTheDocument();
    // The composer is cleared only after the server confirmed.
    expect(screen.getByLabelText('Add a comment')).toHaveValue('');
  });
});
