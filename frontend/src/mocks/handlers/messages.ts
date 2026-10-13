/**
 * Mock direct messages (spec 3.7, 6.7).
 *
 * IDEMPOTENT SENDS
 *   Every send carries a `clientMessageId` generated once by the client and
 *   reused on every retry. If a message with that id already exists the server
 *   returns the stored one instead of creating a second, which is what makes
 *   "retry after an ambiguous failure" safe. Without it, a request that
 *   succeeded but whose response was lost would produce a duplicate.
 *
 * SIMULATED REPLIES
 *   There is nobody on the other end. When the demo user has sent a message
 *   and no reply has followed within a few seconds, reading the conversation
 *   generates one canned reply from the seed account. The UI labels the whole
 *   conversation as simulated - see `ConversationPage`.
 *
 * REAL-TIME
 *   There is no WebSocket here and none is claimed. The client polls
 *   `GET /messages/conversations/:id` on an interval; the integration point for
 *   a real transport is documented in docs/backend-integration.md.
 */
import { http, HttpResponse } from 'msw';
import type { Conversation, Message } from '@/shared/types/message';
import { createAnonymousIdentity } from '../fixtures/identities';
import { db, nextId, nowIso, persist } from '../db';
import type { MockConversation, MockMessage, MockUser } from '../types';
import {
  errorResponse,
  notFound,
  currentUser,
  simulateLatency,
  unauthorized,
  url,
  validationError,
} from '../helpers';

const SIMULATED_REPLY_DELAY_MS = 4000;

const SIMULATED_REPLIES = [
  'Thanks for reaching out. Happy to talk through what worked for me.',
  'Yes, I went through something similar last year. What stage are you at?',
  'I am glad the post helped. Ask me anything you like.',
];

/** Transient, per-session record of which sends have already failed once. */
const failedOnce = new Set<string>();

function peerOf(conversation: MockConversation, userId: string): string {
  const [first, second] = conversation.participantIds;
  return first === userId ? second : first;
}

function messagesIn(conversationId: string): MockMessage[] {
  return db()
    .messages.filter((message) => message.conversationId === conversationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function toConversation(conversation: MockConversation, viewer: MockUser): Conversation {
  const thread = messagesIn(conversation.id);
  const last = thread[thread.length - 1];

  return {
    id: conversation.id,
    peer: createAnonymousIdentity(peerOf(conversation, viewer.id)),
    lastMessagePreview: last?.body ?? null,
    lastMessageAt: last?.createdAt ?? null,
    unreadCount: thread.filter(
      (message) => message.senderId !== viewer.id && !message.readBy.includes(viewer.id),
    ).length,
  };
}

function toMessage(message: MockMessage, viewer: MockUser): Message {
  return {
    id: message.id,
    conversationId: message.conversationId,
    body: message.body,
    direction: message.senderId === viewer.id ? 'outgoing' : 'incoming',
    createdAt: message.createdAt,
    clientMessageId: message.clientMessageId,
  };
}

/**
 * Generate one canned reply when the user's last message has gone unanswered.
 * Stands in for another person; clearly labelled as such in the UI.
 */
function maybeSimulateReply(conversation: MockConversation, viewerId: string): void {
  const thread = messagesIn(conversation.id);
  const last = thread[thread.length - 1];
  if (!last || last.senderId !== viewerId) return;

  const age = Date.now() - new Date(last.createdAt).getTime();
  if (age < SIMULATED_REPLY_DELAY_MS) return;

  const peerId = peerOf(conversation, viewerId);
  const replyIndex = thread.filter((message) => message.senderId === peerId).length;
  const body = SIMULATED_REPLIES[replyIndex % SIMULATED_REPLIES.length];
  if (!body) return;

  db().messages.push({
    id: nextId('msg'),
    conversationId: conversation.id,
    senderId: peerId,
    body,
    createdAt: nowIso(),
    clientMessageId: null,
    readBy: [],
  });
  persist();
}

export const messageHandlers = [
  http.get(url('/messages/conversations'), async ({ request }) => {
    await simulateLatency(160);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized('Sign in to see your messages.');

    const conversations = db()
      .conversations.filter((conversation) => conversation.participantIds.includes(viewer.id))
      .map((conversation) => toConversation(conversation, viewer))
      .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));

    return HttpResponse.json(conversations);
  }),

  /** Start (or reopen) a conversation from an author's anonymous avatar. */
  http.post(url('/messages/conversations'), async ({ request }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const body = (await request.json()) as { anonymousId?: string };
    const anonymousId = body.anonymousId?.trim();
    if (!anonymousId) {
      return validationError('Choose someone to message.');
    }

    // Resolve the anonymous handle back to an account. Only the server can do
    // this; the client never learns who the other person is.
    const target = db().users.find(
      (user) => createAnonymousIdentity(user.id).id === anonymousId,
    );
    if (!target) return notFound('That person is no longer available.');
    if (target.id === viewer.id) {
      return validationError('You cannot start a conversation with yourself.');
    }

    const existing = db().conversations.find(
      (conversation) =>
        conversation.participantIds.includes(viewer.id) &&
        conversation.participantIds.includes(target.id),
    );
    if (existing) {
      return HttpResponse.json(toConversation(existing, viewer));
    }

    const conversation: MockConversation = {
      id: nextId('conv'),
      participantIds: [viewer.id, target.id],
      createdAt: nowIso(),
    };
    db().conversations.push(conversation);
    persist();

    return HttpResponse.json(toConversation(conversation, viewer), { status: 201 });
  }),

  http.get(url('/messages/conversations/:conversationId'), async ({ request, params }) => {
    await simulateLatency(160);
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const conversation = db().conversations.find(
      (item) => item.id === String(params['conversationId']),
    );
    if (!conversation || !conversation.participantIds.includes(viewer.id)) {
      return notFound('That conversation no longer exists.');
    }

    maybeSimulateReply(conversation, viewer.id);

    // Opening the conversation marks the other side's messages as read.
    let changed = false;
    for (const message of db().messages) {
      if (
        message.conversationId === conversation.id &&
        message.senderId !== viewer.id &&
        !message.readBy.includes(viewer.id)
      ) {
        message.readBy.push(viewer.id);
        changed = true;
      }
    }
    if (changed) persist();

    return HttpResponse.json({
      conversation: toConversation(conversation, viewer),
      messages: messagesIn(conversation.id).map((message) => toMessage(message, viewer)),
    });
  }),

  http.post(url('/messages/conversations/:conversationId/messages'), async ({ request, params }) => {
    await simulateLatency();
    const viewer = currentUser(request);
    if (!viewer) return unauthorized();

    const conversation = db().conversations.find(
      (item) => item.id === String(params['conversationId']),
    );
    if (!conversation || !conversation.participantIds.includes(viewer.id)) {
      return notFound('That conversation no longer exists.');
    }

    const body = (await request.json()) as { body?: string; clientMessageId?: string };
    const text = body.body?.trim() ?? '';
    const clientMessageId = body.clientMessageId?.trim() ?? '';

    if (!text) {
      return validationError('Write a message before sending.', {
        body: ['Write a message before sending.'],
      });
    }
    if (!clientMessageId) {
      return validationError('Missing clientMessageId. Retries would create duplicates.');
    }

    // Idempotency: a retry of an already-stored send returns the same message
    // rather than creating a second copy.
    const stored = db().messages.find(
      (message) => message.clientMessageId === clientMessageId,
    );
    if (stored) {
      return HttpResponse.json(toMessage(stored, viewer));
    }

    // QA affordance: a message containing "!fail" fails its FIRST attempt so
    // the retry path can be demonstrated and tested. The retry sends the same
    // clientMessageId and succeeds.
    if (text.includes('!fail') && !failedOnce.has(clientMessageId)) {
      failedOnce.add(clientMessageId);
      return errorResponse(503, 'server_error', 'Something went wrong. Please try again.');
    }

    const message: MockMessage = {
      id: nextId('msg'),
      conversationId: conversation.id,
      senderId: viewer.id,
      body: text,
      createdAt: nowIso(),
      clientMessageId,
      readBy: [viewer.id],
    };

    db().messages.push(message);
    persist();

    return HttpResponse.json(toMessage(message, viewer), { status: 201 });
  }),
];
