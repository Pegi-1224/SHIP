import { Link } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import type { PostPreview } from '@/shared/types/demoSearch';
import { UserAvatar } from '@/shared/ui';
import { formatTimeAgo } from '@/shared/utils/format';
import styles from './DiscussionPreview.module.css';

export interface DiscussionPreviewCardProps {
  post: PostPreview;
}

/**
 * Compact post card: author, time, title (two lines at most) and comment count.
 * The whole card links to the discussion page.
 */
export function DiscussionPreviewCard({ post }: DiscussionPreviewCardProps) {
  const { author } = post;

  return (
    <Link to={paths.discussionDetail(post.id)} className={styles.cardLink}>
      <article className={styles.card}>
        <div className={styles.meta}>
          <UserAvatar name={author.displayName} avatarUrl={author.avatarUrl} seed={author.refId} />
          <span className={styles.byline}>
            {author.displayName} ·{' '}
            <time dateTime={post.createdAt}>{formatTimeAgo(post.createdAt)}</time>
          </span>
        </div>
        <h4 className={styles.title}>{post.title}</h4>
        <p className={styles.comments}>
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </p>
      </article>
    </Link>
  );
}
