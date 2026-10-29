import type { CommentPreview } from '@/shared/types/demoSearch';
import { UserAvatar } from '@/shared/ui';
import { formatTimeAgo } from '@/shared/utils/format';
import styles from './PostDetail.module.css';

/** One comment under a discussion post. */
export function CommentCard({ comment }: { comment: CommentPreview }) {
  const { author } = comment;

  return (
    <article className={styles.comment}>
      <div className={styles.commentMeta}>
        <UserAvatar
          name={author.displayName}
          avatarUrl={author.avatarUrl}
          seed={author.refId}
          size={32.4}
        />
        <span className={styles.commentByline}>
          {author.displayName} ·{' '}
          <time dateTime={comment.createdAt}>{formatTimeAgo(comment.createdAt)}</time>
        </span>
      </div>
      <p className={styles.commentText}>{comment.content}</p>
    </article>
  );
}
