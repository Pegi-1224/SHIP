/**
 * The behaviour that matters most here is retry safety: a send that fails
 * must be retryable, and retrying must never produce two copies of the same
 * message.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { signInTestUser } from '@/test/signIn';
import { createAnonymousIdentity } from '@/mocks/fixtures/identities';
import { seedUserId } from '@/mocks/fixtures/users';
import { startConversation } from '../api/messagesApi';
import { ConversationPage } from './ConversationPage';

async function openConversationWithSeedUser() {
  const anonymousId = createAnonymousIdentity(seedUserId(0)).id;
  return startConversation({ anonymousId });
}

describe('ConversationPage', () => {
  it('shows an empty state before anything is said', async () => {
    await signInTestUser();
    const conversation = await openConversationWithSeedUser();

    renderWithProviders(<ConversationPage />, {
      route: `/messages/${conversation.id}`,
      path: '/messages/:conversationId',
    });

    expect(await screen.findByText('Say hello')).toBeInTheDocument();
  });

  it('sends a message and clears the composer', async () => {
    await signInTestUser();
    const conversation = await openConversationWithSeedUser();

    const { user } = renderWithProviders(<ConversationPage />, {
      route: `/messages/${conversation.id}`,
      path: '/messages/:conversationId',
    });

    const composer = await screen.findByLabelText('Message');
    await user.type(composer, 'Thanks for your post, it helped.');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Thanks for your post, it helped.')).toBeInTheDocument();
    await waitFor(() => expect(composer).toHaveValue(''));
  });

  it('keeps the text on failure, and retrying does not create a duplicate', async () => {
    await signInTestUser();
    const conversation = await openConversationWithSeedUser();

    const { user } = renderWithProviders(<ConversationPage />, {
      route: `/messages/${conversation.id}`,
      path: '/messages/:conversationId',
    });

    const composer = await screen.findByLabelText('Message');
    // "!fail" makes the mock backend reject the first attempt only, so the
    // retry path can be exercised deterministically.
    await user.type(composer, 'This one will !fail first');
    await user.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Your message was not sent')).toBeInTheDocument();
    // Nothing the user typed was lost.
    expect(composer).toHaveValue('This one will !fail first');

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    const delivered = await screen.findAllByText('This one will !fail first');
    expect(delivered).toHaveLength(1);
    await waitFor(() => expect(composer).toHaveValue(''));
  });

  it('does not duplicate a message when Send is pressed twice quickly', async () => {
    await signInTestUser();
    const conversation = await openConversationWithSeedUser();

    const { user } = renderWithProviders(<ConversationPage />, {
      route: `/messages/${conversation.id}`,
      path: '/messages/:conversationId',
    });

    const composer = await screen.findByLabelText('Message');
    await user.type(composer, 'Only once please');

    const send = screen.getByRole('button', { name: 'Send' });
    await user.click(send);
    // The button is disabled while the request is in flight, so the second
    // click cannot start a second send.
    await user.click(send);

    await screen.findByText('Only once please');
    expect(screen.getAllByText('Only once please')).toHaveLength(1);
  });

  it('offers no edit or delete control, which the MVP does not support', async () => {
    await signInTestUser();
    const conversation = await openConversationWithSeedUser();

    const { user } = renderWithProviders(<ConversationPage />, {
      route: `/messages/${conversation.id}`,
      path: '/messages/:conversationId',
    });

    await user.type(await screen.findByLabelText('Message'), 'A sent message');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('A sent message');

    expect(screen.queryByRole('button', { name: /edit message/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete message/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Sent messages cannot be edited or deleted in this version/),
    ).toBeInTheDocument();
  });
});
