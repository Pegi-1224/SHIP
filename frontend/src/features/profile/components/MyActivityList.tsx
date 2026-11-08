import { Link } from 'react-router-dom';
import { Loader } from '@mantine/core';
import { getErrorMessage } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import { formatCount, formatTimeAgo, truncate } from '@/shared/utils/format';
import { useMyComments, useMyPosts } from '../hooks/useProfile';
import styles from './MyActivityList.module.css';

/** The user's own posts and comments, newest first, each linking to its discussion. */
export function MyActivityList() {
  const posts = useMyPosts();
  const comments = useMyComments();

  if (posts.isPending || comments.isPending) {
    return (
      <p className={`${styles.status} ${styles.loading}`}>
        <Loader size="xs" /> Loading your posts and comments…
      </p>
    );
  }
  if (posts.isError || comments.isError) {
    return (
      <p className={styles.status} role="alert">
        {getErrorMessage(posts.error ?? comments.error)}
      </p>
    );
  }

  const myPosts = posts.data.items;
  const myComments = comments.data.items;
  if (myPosts.length === 0 && myComments.length === 0) {
    return (
      <p className={styles.status}>
        You have not posted or commented yet.{' '}
        <Link to={paths.discussionNew()} className={styles.link}>
          Start a discussion
        </Link>
      </p>
    );
  }

  return (
    <div className={styles.groups}>
      <section>
        <h3 className={styles.heading}>Posts ({posts.data.total})</h3>
        {myPosts.length === 0 ? (
          <p className={styles.empty}>No posts yet.</p>
        ) : (
          <ul className={styles.list}>
            {myPosts.map((post) => (
              <li key={post.id}>
                <Link to={paths.discussionDetail(post.id)} className={styles.item}>
                  <span className={styles.title}>{post.title}</span>
                  <span className={styles.meta}>
                    {formatTimeAgo(post.createdAt)} · {formatCount(post.commentCount, 'comment')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className={styles.heading}>Comments ({comments.data.total})</h3>
        {myComments.length === 0 ? (
          <p className={styles.empty}>No comments yet.</p>
        ) : (
          <ul className={styles.list}>
            {myComments.map((comment) => (
              <li key={comment.id}>
                <Link to={paths.discussionDetail(comment.postId)} className={styles.item}>
                  <span className={styles.title}>“{truncate(comment.body, 140)}”</span>
                  <span className={styles.meta}>{formatTimeAgo(comment.createdAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
