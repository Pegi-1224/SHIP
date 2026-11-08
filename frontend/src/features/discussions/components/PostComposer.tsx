import { useId, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/app/providers/useAuth';
import { getErrorMessage, isApiError } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import { formatTag } from '@/shared/utils/format';
import { bannedWordMessage, containsBannedWord } from '@/shared/utils/moderation';
import { normalizeTag, validateTag } from '@/shared/utils/tags';
import {
  validateDemoPost,
  type DemoPostFieldErrors,
  type DemoPostInput,
} from '@/shared/utils/demoPosts';
import styles from './PostComposer.module.css';

/** Tags offered on every new post, in the design's order. */
const DEFAULT_TAGS = [
  'maternity leave',
  'negotiation',
  'pay gap',
  'supportive manager',
  'career goals',
] as const;

export interface PostComposerProps {
  heading: string;
  /** Pre-fills the fields when editing. */
  initialValues?: DemoPostInput;
  submitLabel: string;
  isPending: boolean;
  /** The failed-mutation error. Field errors land under their fields. */
  error: unknown;
  onSubmit: (input: DemoPostInput) => void;
  onCancel: () => void;
}

/**
 * "Start a discussion": title, body, tags and a new-tag box, then Cancel / Post.
 *
 * A banned word turns its field's border red and shows a message under it as
 * soon as it is typed, and blocks posting. Other problems (an empty title, no
 * tag) only show once the user tries to post. The check is a convenience; the
 * mock API runs the same one and the real backend must too.
 *
 * Nothing clears on failure, so the user can fix one field and post again.
 */
export function PostComposer({
  heading,
  initialValues,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: PostComposerProps) {
  const { user } = useAuth();
  const location = useLocation();
  const id = useId();

  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [content, setContent] = useState(initialValues?.content ?? '');
  const [selected, setSelected] = useState<string[]>(initialValues?.tags ?? []);
  // Tags shown as chips: the defaults, then any the post already had or the user created.
  const [chips, setChips] = useState<string[]>(() => [
    ...new Set([...DEFAULT_TAGS, ...(initialValues?.tags ?? [])]),
  ]);
  const [newTag, setNewTag] = useState('');
  const [newTagError, setNewTagError] = useState<string | null>(null);
  const [submitErrors, setSubmitErrors] = useState<DemoPostFieldErrors>({});

  const serverErrors: DemoPostFieldErrors =
    isApiError(error) && error.fieldErrors ? error.fieldErrors : {};

  // Banned words are flagged live; everything else waits for a Post attempt.
  const titleError = containsBannedWord(title)
    ? bannedWordMessage('title')
    : (submitErrors['title']?.[0] ?? serverErrors['title']?.[0] ?? null);
  const contentError = containsBannedWord(content)
    ? bannedWordMessage('post')
    : (submitErrors['content']?.[0] ?? serverErrors['content']?.[0] ?? null);
  const tagsError = submitErrors['tags']?.[0] ?? serverErrors['tags']?.[0] ?? null;
  const newTagMessage = containsBannedWord(newTag) ? bannedWordMessage('tag') : newTagError;

  // Only a request-level failure goes in the notice; field errors are shown in place.
  const requestError = error && Object.keys(serverErrors).length === 0 ? error : null;

  function toggleTag(tag: string) {
    setSelected((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
    setSubmitErrors(({ tags: _tags, ...rest }) => rest);
  }

  function addTag() {
    const result = validateTag(newTag);
    if (!result.valid) {
      setNewTagError(result.message);
      return;
    }
    const tag = normalizeTag(newTag);
    setChips((current) => (current.includes(tag) ? current : [...current, tag]));
    setSelected((current) => (current.includes(tag) ? current : [...current, tag]));
    setSubmitErrors(({ tags: _tags, ...rest }) => rest);
    setNewTag('');
    setNewTagError(null);
  }

  function handleNewTagKey(event: KeyboardEvent<HTMLInputElement>) {
    // Enter adds the tag rather than posting the whole form.
    if (event.key === 'Enter') {
      event.preventDefault();
      addTag();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    if (!user) return;
    const result = validateDemoPost({ title, content, tags: selected });
    if (!result.ok) {
      setSubmitErrors(result.fieldErrors);
      return;
    }
    setSubmitErrors({});
    onSubmit(result.post);
  }

  const fieldClass = (base: string | undefined, message: string | null) =>
    message ? `${base} ${styles.invalid}` : base;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.subtitle}>
        You’ll post as Anonymous. Your name and email are never shown.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.card}>
          <div className={styles.field}>
            <label htmlFor={`${id}-title`} className={styles.label}>
              Title
            </label>
            <input
              id={`${id}-title`}
              className={fieldClass(styles.input, titleError)}
              value={title}
              onChange={(event) => {
                setTitle(event.currentTarget.value);
                setSubmitErrors(({ title: _title, ...rest }) => rest);
              }}
              placeholder="Give your discussion a clear title"
              aria-invalid={titleError ? true : undefined}
              aria-describedby={titleError ? `${id}-title-error` : undefined}
            />
            {titleError ? (
              <p id={`${id}-title-error`} className={styles.error} role="alert">
                {titleError}
              </p>
            ) : null}
          </div>

          <div className={styles.field}>
            <label htmlFor={`${id}-content`} className={styles.label}>
              Your post
            </label>
            <textarea
              id={`${id}-content`}
              className={fieldClass(styles.textarea, contentError)}
              value={content}
              onChange={(event) => {
                setContent(event.currentTarget.value);
                setSubmitErrors(({ content: _content, ...rest }) => rest);
              }}
              placeholder="Share your experience or question. No length limit."
              aria-invalid={contentError ? true : undefined}
              aria-describedby={contentError ? `${id}-content-error` : undefined}
            />
            {contentError ? (
              <p id={`${id}-content-error`} className={styles.error} role="alert">
                {contentError}
              </p>
            ) : null}
          </div>

          <fieldset
            className={`${styles.field} ${styles.spaced} ${styles.fieldset}`}
            aria-describedby={tagsError ? `${id}-tags-error` : undefined}
          >
            <legend className={styles.label}>Tags (at least 1)</legend>
            <div className={styles.tags}>
              {chips.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={styles.tag}
                  aria-pressed={selected.includes(tag)}
                  onClick={() => toggleTag(tag)}
                >
                  {formatTag(tag)}
                </button>
              ))}
            </div>
            {tagsError ? (
              <p id={`${id}-tags-error`} className={styles.error} role="alert">
                {tagsError}
              </p>
            ) : null}
          </fieldset>

          <div className={`${styles.field} ${styles.newTag}`}>
            <label htmlFor={`${id}-new-tag`} className={styles.label}>
              Create a new tag
            </label>
            <div className={styles.newTagRow}>
              <input
                id={`${id}-new-tag`}
                className={fieldClass(styles.input, newTagMessage)}
                value={newTag}
                onChange={(event) => {
                  setNewTag(event.currentTarget.value);
                  setNewTagError(null);
                }}
                onKeyDown={handleNewTagKey}
                placeholder="e.g. remote work (letters, numbers, spaces)"
                aria-invalid={newTagMessage ? true : undefined}
                aria-describedby={newTagMessage ? `${id}-new-tag-error` : undefined}
              />
              <button
                type="button"
                className={`${styles.button} ${styles.addButton}`}
                onClick={addTag}
                disabled={!newTag.trim()}
              >
                Add
              </button>
            </div>
            {newTagMessage ? (
              <p id={`${id}-new-tag-error`} className={styles.error} role="alert">
                {newTagMessage}
              </p>
            ) : null}
          </div>
        </div>

        {!user ? (
          <p className={styles.notice}>
            <Link to={paths.loginWithRedirect(location.pathname)}>Sign in</Link> to post. Your post
            will still show as Anonymous.
          </p>
        ) : null}
        {requestError ? (
          <p className={styles.notice} role="alert">
            {getErrorMessage(requestError)}
          </p>
        ) : null}

        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.cancel}`}
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`${styles.button} ${styles.primary}`}
            disabled={isPending || !user}
          >
            {isPending ? '…' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
