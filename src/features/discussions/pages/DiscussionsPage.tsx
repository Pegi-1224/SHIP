import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Group, Paper, Stack, Text } from '@mantine/core';
import { MessageSquarePlus } from 'lucide-react';
import { paths } from '@/shared/config/paths';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  PostCard,
  SearchInput,
  TagPill,
} from '@/shared/ui';
import { formatCount, formatTag } from '@/shared/utils/format';
import { normalizeTag } from '@/shared/utils/tags';
import { useStartConversationFlow } from '@/features/messages';
import { usePosts, useTagSearch } from '../hooks/useDiscussions';

/**
 * The discussion feed (spec 3.4, AC-2).
 *
 * Tag and free-text filters live in the URL so a filtered view can be shared
 * and the Back button restores it. Posts are newest first, which the server
 * guarantees.
 */
export function DiscussionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startWith, isPending: isStartingConversation } = useStartConversationFlow();

  const tag = searchParams.get('tag') ?? undefined;
  const query = searchParams.get('q') ?? undefined;

  const posts = usePosts({ tag, q: query });
  const tags = useTagSearch('');

  const applySearch = (value: string) => {
    const trimmed = value.trim();
    const next = new URLSearchParams();

    // A search that looks like "#maternity leave" is a tag filter, not a
    // free-text search - that is how people actually type it (AC-2).
    if (trimmed.startsWith('#')) {
      const normalized = normalizeTag(trimmed);
      if (normalized) next.set('tag', normalized);
    } else if (trimmed) {
      next.set('q', trimmed);
    }

    setSearchParams(next);
  };

  return (
    <Stack gap="lg">
      <PageHeader
        title="Discussions"
        description="Search by tag to find the conversations you care about. Everyone here posts anonymously."
        action={
          <Button
            leftSection={<MessageSquarePlus size={16} aria-hidden="true" />}
            onClick={() => navigate(paths.discussionNew())}
          >
            New post
          </Button>
        }
      />

      <SearchInput
        label="Search discussions"
        placeholder="Search a tag like #pay gap, or any words"
        defaultValue={tag ? formatTag(tag) : (query ?? '')}
        onSearch={applySearch}
      />

      {tags.data && tags.data.length > 0 ? (
        <Paper withBorder p="md">
          <Text size="xs" fw={600} c="dimmed" mb="xs">
            Popular tags
          </Text>
          <Group gap="xs" wrap="wrap">
            {tags.data.slice(0, 12).map((entry) => (
              <TagPill key={entry.name} tag={entry.name} asLink active={entry.name === tag} />
            ))}
          </Group>
        </Paper>
      ) : null}

      {tag || query ? (
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {tag ? `Filtered by ${formatTag(tag)}` : `Searching for "${query}"`}
          </Text>
          <Button variant="subtle" size="compact-xs" onClick={() => setSearchParams({})}>
            Clear
          </Button>
        </Group>
      ) : null}

      {posts.isPending ? (
        <LoadingState label="Loading discussions…" />
      ) : posts.isError ? (
        <ErrorState
          error={posts.error}
          onRetry={() => void posts.refetch()}
          isRetrying={posts.isFetching}
        />
      ) : posts.data.items.length === 0 ? (
        <EmptyState
          title="There's no related info yet."
          description={
            tag
              ? `No posts carry ${formatTag(tag)} yet. You could write the first one.`
              : 'No posts match that search yet.'
          }
          action={{ label: 'Write a post', onClick: () => navigate(paths.discussionNew()) }}
        />
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed" role="status">
            {formatCount(posts.data.total, 'post')}, newest first
          </Text>
          {posts.data.items.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onStartConversation={
                post.isOwn || isStartingConversation
                  ? undefined
                  : (target) => startWith(target.author.id)
              }
              messagingDisabledReason={post.isOwn ? 'This is your own post' : undefined}
            />
          ))}
        </Stack>
      )}
    </Stack>
  );
}
