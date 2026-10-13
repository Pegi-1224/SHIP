/**
 * Message queries and mutations.
 *
 * REAL-TIME INTEGRATION POINT
 *   New messages arrive by polling: `useConversation` refetches on an interval
 *   while the conversation is open. That is the whole "real-time" story in this
 *   build, and nothing here claims otherwise - there is no WebSocket and no
 *   server-sent events connection.
 *
 *   To move to a push transport, replace `refetchInterval` with a subscription
 *   that calls `queryClient.setQueryData(queryKeys.messages.conversation(id), …)`
 *   when a frame arrives. Nothing else in the feature needs to change. The
 *   protocol has to be agreed with the backend first - see
 *   docs/backend-integration.md, "Messaging transport".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api';
import type { SendMessageInput, StartConversationInput } from '@/shared/types/message';
import {
  fetchConversation,
  fetchConversations,
  sendMessage,
  startConversation,
} from '../api/messagesApi';

/** How often an open conversation re-reads the thread. */
export const CONVERSATION_POLL_INTERVAL_MS = 5000;

export function useConversations() {
  return useQuery({
    queryKey: queryKeys.messages.conversations,
    queryFn: ({ signal }) => fetchConversations(signal),
  });
}

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.messages.conversation(conversationId ?? ''),
    queryFn: ({ signal }) => fetchConversation(conversationId as string, signal),
    enabled: Boolean(conversationId),
    refetchInterval: CONVERSATION_POLL_INTERVAL_MS,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartConversationInput) => startConversation(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations }),
  });
}

/**
 * Sends one message.
 *
 * On success the thread and the conversation list are invalidated. No optimistic
 * message is inserted: an optimistic bubble plus a retry is exactly how
 * duplicates appear on screen, and the real message arrives in well under a
 * second here.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(conversationId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.messages.conversation(conversationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.messages.conversations }),
      ]);
    },
  });
}
