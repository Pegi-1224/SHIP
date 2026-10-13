import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import type { Post } from '@/shared/types/discussion';
import { paths } from '@/shared/config/paths';
import { formatCount, formatRelativeTime, truncate } from '@/shared/utils/format';
import { AnonymousAvatar } from './AnonymousAvatar';
import { TagPill } from './TagPill';
import styles from './PostCard.module.css';

export interface PostCardProps {
  post: Post;
  /**
   * Starts a direct message with the author (spec 3.4). Omit it for signed-out
   * visitors, who cannot send messages, so the avatar stays non-interactive
   * rather than becoming a button that does nothing.
   */
  onStartConversation?: ((post: Post) => void) | undefined;
  /** Why messaging is unavailable, shown as the avatar's tooltip. */
  messagingDisabledReason?: string;
  /** Signed-out previews link to sign-in instead of the post. */
  linkTo?: string;
}

/**
 * The post summary used in the discussion feed, home recommendations, public
 * previews and the profile's post history.
 *
 * The body is rendered as plain text. There is no markdown or HTML pipeline, so
 * user content cannot inject markup.
 */
export function PostCard({
  post,
  onStartConversation,
  messagingDisabledReason,
  linkTo,
}: PostCardProps) {
  return (
    <Paper component="article" withBorder p="md" className={styles.card}>
      <Group align="flex-start" wrap="nowrap" gap="md">
        <AnonymousAvatar
          identity={post.author}
          onStartConversation={
            onStartConversation ? () => onStartConversation(post) : undefined
          }
          disabledReason={onStartConversation ? undefined : messagingDisabledReason}
        />

        <Stack gap="xs" className={styles.body}>
          <div>
            <Title order={3} size="var(--ship-text-md)" className={styles.title}>
              <Link to={linkTo ?? paths.discussionDetail(post.id)} className={styles.titleLink}>
                {post.title}
              </Link>
            </Title>
            <Text size="xs" c="dimmed" mt={2}>
              {post.author.label} · {formatRelativeTime(post.createdAt)}
              {post.editedAt ? (
                <>
                  {' · '}
                  <span className={styles.edited}>Edited</span>
                </>
              ) : null}
            </Text>
          </div>

          <Text size="sm" className={styles.excerpt}>
            {truncate(post.body, 220)}
          </Text>

          <Group gap="xs" wrap="wrap">
            {post.tags.map((tag) => (
              <TagPill key={tag} tag={tag} asLink />
            ))}
          </Group>

          <Group gap={6} c="dimmed">
            <MessageSquare size={14} aria-hidden="true" />
            <Text size="xs">{formatCount(post.commentCount, 'comment')}</Text>
          </Group>
        </Stack>
      </Group>
    </Paper>
  );
}
