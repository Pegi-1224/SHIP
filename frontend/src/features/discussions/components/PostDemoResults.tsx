import { Stack, Text } from '@mantine/core';
import { QueryStateView } from '@/shared/ui';
import { useDemoPostSearch } from '../hooks/useDiscussions';
import { PostRecordCard } from './PostRecordCard';

export interface PostDemoResultsProps {
  /** What the user typed in the header's discussion search (the `q` URL value). */
  query: string;
}

/**
 * Published posts whose title, tags or content match `query`, best match
 * first; every post (newest first) when it is empty. Data comes from
 * `GET /demo/posts?q=`, served from `src/mocks/data/posts.json`.
 */
export function PostDemoResults({ query }: PostDemoResultsProps) {
  const q = query.trim();
  const search = useDemoPostSearch(q);

  return (
    <QueryStateView
      query={search}
      loadingLabel="Searching discussions…"
      isEmpty={(data) => data.items.length === 0}
      emptyProps={{
        title: 'No matching discussions',
        description: `No demo post mentions "${q}".`,
      }}
    >
      {(data) => (
        <Stack gap="sm" aria-live="polite">
          <Text size="sm" c="dimmed">
            {q
              ? `${data.total} ${data.total === 1 ? 'post' : 'posts'} matching "${q}"`
              : `All ${data.total} demo posts, newest first`}
          </Text>
          {data.items.map((hit) => (
            <PostRecordCard key={hit.item.id} post={hit.item} score={hit.score} />
          ))}
        </Stack>
      )}
    </QueryStateView>
  );
}
