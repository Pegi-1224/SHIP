import { useState } from 'react';
import { Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import type { PostRecord } from '@/shared/types/demoSearch';
import { TagPill } from '@/shared/ui';
import { formatRelativeTime, truncate } from '@/shared/utils/format';

const PREVIEW_LENGTH = 140;

export interface PostRecordCardProps {
  post: PostRecord;
  /** Match score from the search, shown so ranking is easy to check in the demo. */
  score?: number;
}

/** One discussion search result: a preview, with the full post behind "Read more". */
export function PostRecordCard({ post, score }: PostRecordCardProps) {
  const [open, setOpen] = useState(false);
  const isLong = post.content.length > PREVIEW_LENGTH;

  return (
    <Paper component="article" withBorder p="md">
      <Stack gap={6}>
        <Group gap="xs" wrap="wrap">
          <Title order={3} size="var(--ship-text-md)">
            {post.title}
          </Title>
          {score !== undefined && score < 1 ? (
            <Text size="xs" c="dimmed">
              match {Math.round(score * 100)}%
            </Text>
          ) : null}
        </Group>

        <Text size="xs" c="dimmed">
          {post.authorRefId} · {formatRelativeTime(post.createdAt)}
          {post.updatedAt ? ' · Edited' : ''} · {post.id}
        </Text>

        <Text size="sm">
          {open || !isLong ? post.content : truncate(post.content, PREVIEW_LENGTH)}
        </Text>

        <Group gap={6} wrap="wrap">
          {post.tags.map((tag) => (
            <TagPill key={tag} tag={tag} />
          ))}
        </Group>

        <Group gap="md" wrap="wrap">
          <Text size="xs" c="dimmed" span>
            <MessageSquare size={12} aria-hidden="true" /> {post.commentCount}{' '}
            {post.commentCount === 1 ? 'comment' : 'comments'}
          </Text>
          {post.relatedCompanyIds.length > 0 ? (
            <Text size="xs" c="dimmed" span>
              About: {post.relatedCompanyIds.join(', ')}
            </Text>
          ) : null}
          {isLong ? (
            <Button
              variant="subtle"
              size="compact-xs"
              rightSection={open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? 'Show less' : 'Read more'}
            </Button>
          ) : null}
        </Group>
      </Stack>
    </Paper>
  );
}
