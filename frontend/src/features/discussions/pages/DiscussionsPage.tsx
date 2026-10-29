import { Link, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@mantine/core';
import { getErrorMessage } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import { formatTag } from '@/shared/utils/format';
import { DiscussionListCard } from '../components/DiscussionListCard';
import { TagNav } from '../components/TagNav';
import { useDemoPostFeed } from '../hooks/useDiscussions';
import styles from '../components/DiscussionFeed.module.css';

/** Tags always listed in the sidebar, top to bottom (UI design). */
const NAV_TAGS = [
  'maternity leave',
  'pay gap',
  'supportive manager',
  'career goals',
  'negotiation',
  'movement support',
] as const;

/**
 * The discussion feed (`/discussions`).
 *
 * `?tag=` filters by one tag (from the sidebar or a post's tag) and `?q=` is
 * the header's discussion search; both live in the URL, so a filtered feed
 * can be shared and Back undoes a tag click. Data: `GET /demo/posts`.
 */
export function DiscussionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const tag = (searchParams.get('tag') ?? '').trim().toLowerCase();
  const feed = useDemoPostFeed(q, tag);

  // A tag picked from a post that is not in the default list still shows as selected.
  const navTags: readonly string[] =
    tag && !NAV_TAGS.some((item) => item === tag) ? [...NAV_TAGS, tag] : NAV_TAGS;

  function selectTag(next: string) {
    setSearchParams((params) => {
      const updated = new URLSearchParams(params);
      if (next) updated.set('tag', next);
      else updated.delete('tag');
      return updated;
    });
  }

  const total = feed.data?.total ?? 0;
  const countLabel = `${total} ${total === 1 ? 'post' : 'posts'}${q ? ` matching "${q}"` : ''}`;

  return (
    <div className={styles.layout}>
      <TagNav tags={navTags} selected={tag} onSelect={selectTag} />

      <section aria-labelledby="feed-title">
        <header className={styles.feedHeader}>
          <div>
            <h1 id="feed-title" className={styles.feedTitle}>
              {tag ? formatTag(tag) : 'Latest discussions'}
            </h1>
            <p className={styles.feedCount} aria-live="polite">
              {feed.isPending ? 'Loading posts…' : countLabel}
            </p>
          </div>
          <Link to={paths.discussionNew()} className={styles.newPost}>
            + New post
          </Link>
        </header>

        <div className={styles.feed}>
          {feed.isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} height={198} radius={18} />
              ))
            : null}

          {feed.isError ? (
            <p className={styles.notice} role="alert">
              {getErrorMessage(feed.error)}
            </p>
          ) : null}

          {feed.data?.items.length === 0 ? (
            <p className={styles.notice}>
              {tag
                ? `No discussions tagged ${formatTag(tag)}${q ? ` match "${q}"` : ' yet'}.`
                : `No discussions match "${q}".`}
            </p>
          ) : null}

          {feed.data?.items.map((hit) => (
            <DiscussionListCard key={hit.item.id} post={hit.item} onTagClick={selectTag} />
          ))}
        </div>
      </section>
    </div>
  );
}
