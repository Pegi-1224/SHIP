import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Anchor, Button, Divider, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/api';
import { paths } from '@/shared/config/paths';
import {
  AnonymousAvatar,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  TagPill,
  notifySuccess,
} from '@/shared/ui';
import { formatRelativeTime } from '@/shared/utils/format';
import { useStartConversationFlow } from '@/features/messages';
import { CommentSection } from '../components/CommentSection';
import { useDeletePost, useMarkPostRead, usePost } from '../hooks/useDiscussions';
import styles from './PostDetailPage.module.css';

/**
 * A post and its comments (spec 3.4, 6.7).
 *
 * Opening this page is what counts as "reading" a post, so it fires the
 * read-tracking call once. Read posts drop out of home recommendations.
 */
export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();

  const post = usePost(postId);
  const deletePost = useDeletePost();
  const markRead = useMarkPostRead();
  const { startWith, isPending: isStartingConversation } = useStartConversationFlow();

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Mark as read once per post, not on every re-render.
  const markedPostId = useRef<string | null>(null);
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    if (!postId || markedPostId.current === postId) return;
    markedPostId.current = postId;
    markReadMutate(postId);
  }, [postId, markReadMutate]);

  if (post.isPending) return <LoadingState label="Loading post…" />;

  if (post.isError) {
    return (
      <Stack gap="md">
        <BackLink />
        <ErrorState
          error={post.error}
          title="We could not load this post"
          onRetry={() => void post.refetch()}
          isRetrying={post.isFetching}
        />
      </Stack>
    );
  }

  const data = post.data;

  const handleDelete = () => {
    deletePost.mutate(data.id, {
      onSuccess: () => {
        notifySuccess('Your post and its comments were deleted.');
        navigate(paths.discussions(), { replace: true });
      },
    });
  };

  return (
    <Stack gap="lg" className={styles.page}>
      <BackLink />

      <Paper withBorder p="lg" component="article">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
            <Group gap="sm" wrap="nowrap">
              <AnonymousAvatar
                identity={data.author}
                onStartConversation={
                  data.isOwn || isStartingConversation
                    ? undefined
                    : () => startWith(data.author.id)
                }
                disabledReason={data.isOwn ? 'This is your own post' : undefined}
              />
              <div>
                <Text size="sm" fw={600}>
                  {data.author.label}
                  {data.isOwn ? ' (you)' : ''}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatRelativeTime(data.createdAt)}
                  {data.editedAt ? ' · Edited' : ''}
                </Text>
              </div>
            </Group>

            {data.isOwn ? (
              <Group gap="xs">
                <Button
                  variant="light"
                  size="xs"
                  leftSection={<Pencil size={14} aria-hidden="true" />}
                  onClick={() => navigate(paths.discussionEdit(data.id))}
                >
                  Edit
                </Button>
                <Button
                  variant="light"
                  color="red"
                  size="xs"
                  leftSection={<Trash2 size={14} aria-hidden="true" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete
                </Button>
              </Group>
            ) : null}
          </Group>

          <Title order={1} size="var(--ship-text-2xl)">
            {data.title}
          </Title>

          <Text className={styles.body}>{data.body}</Text>

          <Group gap="xs" wrap="wrap">
            {data.tags.map((tag) => (
              <TagPill key={tag} tag={tag} asLink />
            ))}
          </Group>

          {!data.isOwn ? (
            <Text size="xs" c="dimmed">
              Tap the avatar to message this person. Both of you stay anonymous.
            </Text>
          ) : null}
        </Stack>
      </Paper>

      <Divider />

      <CommentSection postId={data.id} />

      <ConfirmDialog
        opened={confirmDelete}
        title="Delete this post?"
        description="The post and every comment on it will be removed for everyone. This cannot be undone."
        confirmLabel="Delete post"
        tone="danger"
        isPending={deletePost.isPending}
        errorMessage={deletePost.error ? getErrorMessage(deletePost.error) : null}
        onConfirm={handleDelete}
        onCancel={() => {
          setConfirmDelete(false);
          deletePost.reset();
        }}
      />
    </Stack>
  );
}

function BackLink() {
  return (
    <Anchor component={Link} to={paths.discussions()} size="sm">
      <Group gap={4} component="span">
        <ArrowLeft size={14} aria-hidden="true" />
        Back to discussions
      </Group>
    </Anchor>
  );
}
