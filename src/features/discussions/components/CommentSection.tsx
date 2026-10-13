import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActionIcon, Group, Paper, Stack, Text, Textarea, Title } from '@mantine/core';
import { Trash2 } from 'lucide-react';
import type { Comment } from '@/shared/types/discussion';
import {
  AnonymousAvatar,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormErrorAlert,
  LoadingState,
  SubmitButton,
  notifySuccess,
} from '@/shared/ui';
import { getErrorMessage } from '@/shared/api';
import { formatCount, formatRelativeTime } from '@/shared/utils/format';
import { useStartConversationFlow } from '@/features/messages';
import { useComments, useCreateComment, useDeleteComment } from '../hooks/useDiscussions';
import { commentSchema, type CommentFormValues } from '../schemas/postSchema';
import styles from './CommentSection.module.css';

export interface CommentSectionProps {
  postId: string;
}

/**
 * Comments under a post (spec 3.4).
 *
 * Comment bodies render as plain text. There is no markdown or HTML pipeline
 * anywhere in this app, so user content cannot introduce markup or scripts.
 */
export function CommentSection({ postId }: CommentSectionProps) {
  const comments = useComments(postId);
  const createComment = useCreateComment(postId);
  const deleteComment = useDeleteComment(postId);
  const { startWith, isPending: isStartingConversation } = useStartConversationFlow();

  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);

  const form = useForm<CommentFormValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { body: '' },
  });

  const handleSubmit = form.handleSubmit((values) => {
    createComment.mutate(values, {
      onSuccess: () => {
        // Only clear the box once the server confirmed.
        form.reset({ body: '' });
      },
    });
  });

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteComment.mutate(pendingDelete.id, {
      onSuccess: () => {
        notifySuccess('Comment deleted.');
        setPendingDelete(null);
      },
    });
  };

  return (
    <section aria-labelledby="comments-heading">
      <Title id="comments-heading" order={2} size="var(--ship-text-xl)" mb="md">
        Comments
      </Title>

      <Paper withBorder p="md" mb="lg">
        <form onSubmit={handleSubmit} noValidate>
          <Stack gap="sm">
            <Textarea
              {...form.register('body')}
              label="Add a comment"
              placeholder="Share what you know or ask a follow-up."
              autosize
              minRows={3}
              maxRows={10}
              error={form.formState.errors.body?.message}
            />

            <FormErrorAlert
              error={createComment.error}
              onRetry={() => void handleSubmit()}
              isRetrying={createComment.isPending}
            />

            <Group justify="flex-end">
              <SubmitButton isPending={createComment.isPending} pendingLabel="Posting…">
                Post comment
              </SubmitButton>
            </Group>
          </Stack>
        </form>
      </Paper>

      {comments.isPending ? (
        <LoadingState label="Loading comments…" variant="inline" />
      ) : comments.isError ? (
        <ErrorState
          error={comments.error}
          onRetry={() => void comments.refetch()}
          isRetrying={comments.isFetching}
        />
      ) : comments.data.items.length === 0 ? (
        <EmptyState
          title="No comments yet"
          description="Be the first to reply."
        />
      ) : (
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            {formatCount(comments.data.total, 'comment')}
          </Text>
          {comments.data.items.map((comment) => (
            <Paper key={comment.id} withBorder p="md" component="article">
              <Group align="flex-start" wrap="nowrap" gap="sm">
                <AnonymousAvatar
                  identity={comment.author}
                  size={32}
                  onStartConversation={
                    comment.isOwn || isStartingConversation
                      ? undefined
                      : () => startWith(comment.author.id)
                  }
                  disabledReason={comment.isOwn ? 'This is your own comment' : undefined}
                />
                <div className={styles.body}>
                  <Group justify="space-between" wrap="nowrap" gap="sm">
                    <Text size="xs" c="dimmed">
                      {comment.author.label} · {formatRelativeTime(comment.createdAt)}
                      {comment.editedAt ? ' · Edited' : ''}
                      {comment.isOwn ? ' · You' : ''}
                    </Text>
                    {comment.isOwn ? (
                      <ActionIcon
                        variant="subtle"
                        color="red"
                        size="sm"
                        aria-label="Delete your comment"
                        onClick={() => setPendingDelete(comment)}
                      >
                        <Trash2 size={14} />
                      </ActionIcon>
                    ) : null}
                  </Group>
                  <Text size="sm" mt={4} className={styles.text}>
                    {comment.body}
                  </Text>
                </div>
              </Group>
            </Paper>
          ))}
        </Stack>
      )}

      <ConfirmDialog
        opened={pendingDelete !== null}
        title="Delete this comment?"
        description="This cannot be undone. Your comment will be removed for everyone."
        confirmLabel="Delete comment"
        tone="danger"
        isPending={deleteComment.isPending}
        errorMessage={deleteComment.error ? getErrorMessage(deleteComment.error) : null}
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(null);
          deleteComment.reset();
        }}
      />
    </section>
  );
}
