import { Skeleton } from '@mantine/core';
import { formatTag } from '@/shared/utils/format';
import { useLatestDemoPostsByTag } from '../hooks/useDiscussions';
import { DiscussionPreviewCard } from './DiscussionPreviewCard';
import styles from './DiscussionPreview.module.css';

export interface TagDiscussionColumnProps {
  tag: string;
  /** How many of the newest posts to show. */
  limit?: number;
}

/** A `#tag` pill with the newest posts for that tag below it. */
export function TagDiscussionColumn({ tag, limit = 2 }: TagDiscussionColumnProps) {
  const posts = useLatestDemoPostsByTag(tag, limit);
  const headingId = `tag-column-${tag.replace(/\W+/g, '-')}`;

  return (
    <section className={styles.column} aria-labelledby={headingId}>
      <h3 id={headingId} className={styles.pill}>
        {formatTag(tag)}
      </h3>

      {posts.isPending
        ? Array.from({ length: limit }, (_, index) => (
            <Skeleton key={index} height={162} radius={18} />
          ))
        : null}

      {posts.isError ? <p className={styles.notice}>Could not load these discussions.</p> : null}

      {posts.data?.items.length === 0 ? <p className={styles.notice}>No discussions yet.</p> : null}

      {posts.data?.items.map((hit) => (
        <DiscussionPreviewCard key={hit.item.id} post={hit.item} />
      ))}
    </section>
  );
}
