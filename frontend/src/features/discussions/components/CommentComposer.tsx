import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { getErrorMessage } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import { UserAvatar } from '@/shared/ui';
import { useCreateDemoComment } from '../hooks/useDiscussions';
import styles from './PostDetail.module.css';

/**
 * "Add a comment" bar under a post. Signed-out visitors see it too, with a
 * sign-in button in place of Post, so they know commenting is possible.
 */
export function CommentComposer({ postId }: { postId: string }) {
  const { user } = useAuth();
  const location = useLocation();
  const createComment = useCreateDemoComment(postId);
  const [content, setContent] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = content.trim();
    if (!text || createComment.isPending) return;
    createComment.mutate(text, { onSuccess: () => setContent('') });
  }

  if (!user) {
    return (
      <div className={styles.composer}>
        <UserAvatar name="Guest" avatarUrl={null} seed="guest" />
        <span className={styles.composerHint}>Sign in to join the conversation</span>
        <Link to={paths.loginWithRedirect(location.pathname)} className={styles.composerButton}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <form className={styles.composer} onSubmit={handleSubmit}>
        {/* Comments are posted under the anonymous handle, so the avatar matches it. */}
        <UserAvatar name="You" avatarUrl={null} seed={user.anonymousIdentity.id} />
        <input
          className={styles.composerInput}
          value={content}
          onChange={(event) => setContent(event.currentTarget.value)}
          placeholder="Add a comment..."
          aria-label="Add a comment"
          maxLength={2000}
        />
        <button
          type="submit"
          className={styles.composerButton}
          disabled={!content.trim() || createComment.isPending}
        >
          {createComment.isPending ? '…' : 'Post'}
        </button>
      </form>
      {createComment.isError ? (
        <p className={styles.composerError} role="alert">
          {getErrorMessage(createComment.error)}
        </p>
      ) : null}
    </div>
  );
}
