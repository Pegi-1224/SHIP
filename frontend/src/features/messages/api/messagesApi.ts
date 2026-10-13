/** Direct-message API functions (spec 3.7). */
import { api } from '@/shared/api';
import type {
  Conversation,
  Message,
  SendMessageInput,
  StartConversationInput,
} from '@/shared/types/message';

export function fetchConversations(signal?: AbortSignal): Promise<Conversation[]> {
  return api.get<Conversation[]>('/messages/conversations', { signal });
}

export interface ConversationThread {
  conversation: Conversation;
  messages: Message[];
}

export function fetchConversation(
  conversationId: string,
  signal?: AbortSignal,
): Promise<ConversationThread> {
  return api.get<ConversationThread>(
    `/messages/conversations/${encodeURIComponent(conversationId)}`,
    { signal },
  );
}

/**
 * Open a conversation with a post author.
 *
 * The client only ever sends the author's anonymous handle. Resolving it to an
 * account happens on the server, so the browser never learns who the other
 * person is.
 */
export function startConversation(input: StartConversationInput): Promise<Conversation> {
  return api.post<Conversation>('/messages/conversations', input);
}

/**
 * Send a message.
 *
 * `clientMessageId` is generated once per message and reused on every retry.
 * The server treats it as an idempotency key and returns the already-stored
 * message rather than creating a duplicate, which is what makes retrying a
 * failed-looking send safe.
 */
export function sendMessage(conversationId: string, input: SendMessageInput): Promise<Message> {
  return api.post<Message>(
    `/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    input,
  );
}
