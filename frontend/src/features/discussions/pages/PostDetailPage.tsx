import { Link, useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import type { PostPreview } from '@/shared/types/demoSearch';
import { BackLink, QueryStateView, UserAvatar } from '@/shared/ui';
import { formatTag } from '@/shared/utils/format';
import { CommentCard } from '../components/CommentCard';
import { CommentComposer } from '../components/CommentComposer';
import { useDemoComments, useDemoPost } from '../hooks/useDiscussions';
import styles from '../components/PostDetail.module.css';

/**
 * A discussion post and its comments (`/discussions/:postId`).
 *
 * Reads the demo data (`GET /demo/posts/:id` and `/comments`, served from
 * `src/mocks/data/posts.json`, `comments.json` and `users.json`). Readable
 * signed out; commenting needs a session.
 */
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const post = useDemoPost(postId);

  return (
    <div className={styles.page}>
      <BackLink fallback={paths.discussions()} />

      <QueryStateView query={post} loadingLabel="Loading discussion…">
        {(data) => (
          <>
            <PostArticle post={data} />
            <CommentComposer postId={data.id} />
            <CommentList postId={data.id} fallbackCount={data.commentCount} />
          </>
        )}
      </QueryStateView>
    </div>
  );
}

function PostArticle({ post }: { post: PostPreview }) {
  const { author } = post;
  const details = [author.industry, author.location].filter(Boolean).join(' · ');

  return (
    <article className={styles.post} aria-labelledby="post-title">
      <header className={styles.author}>
        <UserAvatar
          name={author.displayName}
          avatarUrl={author.avatarUrl}
          seed={author.refId}
          size={43.2}
        />
        <div>
          <p className={styles.authorName}>{author.displayName}</p>
          {details ? <p className={styles.authorDetails}>{details}</p> : null}
        </div>
      </header>

      <h1 id="post-title" className={styles.title}>
        {post.title}
      </h1>
      <p className={styles.body}>{post.content}</p>

      {post.tags.length > 0 ? (
        <ul className={styles.tags} aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Link to={paths.discussionsSearch(tag)} className={styles.tag}>
                {formatTag(tag)}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

function CommentList({ postId, fallbackCount }: { postId: string; fallbackCount: number }) {
  const comments = useDemoComments(postId);
  const count = comments.data?.total ?? fallbackCount;

  return (
    <section className={styles.comments} aria-labelledby="comments-title">
      <h2 id="comments-title" className={styles.commentsTitle}>
        {count} {count === 1 ? 'comment' : 'comments'}
      </h2>
      <QueryStateView
        query={comments}
        loadingLabel="Loading comments…"
        isEmpty={(data) => data.items.length === 0}
        emptyProps={{ title: 'No comments yet', description: 'Be the first to reply.' }}
      >
        {(data) => data.items.map((comment) => <CommentCard key={comment.id} comment={comment} />)}
      </QueryStateView>
    </section>
  );
}
