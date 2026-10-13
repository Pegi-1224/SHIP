import { Link } from 'react-router-dom';
import { Group, Paper, Stack, Text, Badge } from '@mantine/core';
import { MessagesSquare } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import { AnonymousAvatar, PageHeader, QueryStateView } from '@/shared/ui';
import { formatRelativeTime, truncate } from '@/shared/utils/format';
import { useConversations } from '../hooks/useMessages';
import styles from './Messages.module.css';

/** The conversation list (spec 3.7). */
export function ConversationListPage() {
  const conversations = useConversations();

  return (
    <Stack gap="lg">
      <PageHeader
        title="Messages"
        description="Direct messages are anonymous on both sides. Nobody sees your name or email address."
      />

      <QueryStateView
        query={conversations}
        loadingLabel="Loading your messages…"
        isEmpty={(data) => data.length === 0}
        emptyProps={{
          title: 'No conversations yet',
          description:
            'Open a discussion and tap the avatar next to a post to message its author.',
          icon: <MessagesSquare size={28} aria-hidden="true" />,
        }}
      >
        {(items) => (
          <Stack gap="xs">
            {items.map((conversation) => (
              <Paper
                key={conversation.id}
                component={Link}
                to={paths.conversation(conversation.id)}
                withBorder
                p="md"
                className={styles.conversationRow}
              >
                <Group wrap="nowrap" gap="md" align="flex-start">
                  <AnonymousAvatar identity={conversation.peer} />
                  <div className={styles.conversationBody}>
                    <Group justify="space-between" wrap="nowrap" gap="sm">
                      <Text size="sm" fw={600}>
                        {conversation.peer.label}
                      </Text>
                      <Group gap="xs" wrap="nowrap">
                        {conversation.unreadCount > 0 ? (
                          <Badge size="sm" color="ship">
                            {conversation.unreadCount} new
                          </Badge>
                        ) : null}
                        <Text size="xs" c="dimmed">
                          {formatRelativeTime(conversation.lastMessageAt)}
                        </Text>
                      </Group>
                    </Group>
                    <Text size="sm" c="dimmed" mt={2}>
                      {conversation.lastMessagePreview
                        ? truncate(conversation.lastMessagePreview, 90)
                        : 'No messages yet.'}
                    </Text>
                  </div>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </QueryStateView>
    </Stack>
  );
}
