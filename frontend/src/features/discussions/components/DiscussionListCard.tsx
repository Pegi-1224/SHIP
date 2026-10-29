import { Link } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import type { PostPreview } from '@/shared/types/demoSearch';
import { UserAvatar } from '@/shared/ui';
import { formatTag, formatTimeAgo } from '@/shared/utils/format';
import styles from './DiscussionFeed.module.css';

export interface DiscussionListCardProps {
  post: PostPreview;
  /** Clicking one of the post's tags filters the feed by it. */
  onTagClick: (tag: string) => void;
}

/**
 * One post in the Discussions feed. The title link stretches over the whole
 * card, so clicking anywhere opens the post, while the tag buttons stay
 * clickable on top of it.
 */
export function DiscussionListCard({ post, onTagClick }: DiscussionListCardProps) {
  const { author } = post;

  return (
    <article className={styles.card}>
      <div className={styles.cardMeta}>
        <UserAvatar
          name={author.displayName}
          avatarUrl={author.avatarUrl}
          seed={author.refId}
          size={39.6}
        />
        <span className={styles.cardByline}>
          {author.displayName} ·{' '}
          <time dateTime={post.createdAt}>{formatTimeAgo(post.createdAt)}</time>
        </span>
      </div>

      <h3 className={styles.cardTitle}>
        <Link to={paths.discussionDetail(post.id)} className={styles.cardLink}>
          {post.title}
        </Link>
      </h3>
      <p className={styles.cardContent}>{post.content}</p>

      <div className={styles.cardFooter}>
        <ul className={styles.cardTags} aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                className={styles.cardTag}
                onClick={() => onTagClick(tag)}
                aria-label={`Show posts tagged ${formatTag(tag)}`}
              >
                {formatTag(tag)}
              </button>
            </li>
          ))}
        </ul>
        <span className={styles.cardComments}>
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </span>
      </div>
    </article>
  );
}
