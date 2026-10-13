import { useNavigate } from 'react-router-dom';
import { Alert, Button, Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Building2, Inbox, MessagesSquare, RefreshCw, Sparkles } from 'lucide-react';
import { PUBLIC_PREVIEW_POSTS_PER_TAG } from '@/shared/config/constants';
import { paths } from '@/shared/config/paths';
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PostCard,
  SearchInput,
  TagPill,
} from '@/shared/ui';
import { formatTag } from '@/shared/utils/format';
import { useAuth } from '@/app/providers/useAuth';
import { usePublicPreview } from '@/features/discussions';
import { useStartConversationFlow } from '@/features/messages';
import { useClearReadHistory, useRecommendations } from '../hooks/useHome';
import styles from './HomePage.module.css';

/**
 * Home (spec 3.8, 5.1, 5.4, AC-1, AC-3).
 *
 * Signed out: a limited preview of recent posts per tag, and a prompt to join.
 * No search bars, because signed-out visitors may not use them.
 *
 * Signed in: recommendations built from assessment answers 3 and 4, excluding
 * posts already opened. When nothing unseen is left the page says so rather
 * than recycling posts the user has read.
 */
export function HomePage() {
  const { isAuthenticated, user, status } = useAuth();

  if (status === 'loading') return <LoadingState label="Loading…" />;

  return isAuthenticated && user?.hasCompletedAssessment ? (
    <SignedInHome />
  ) : isAuthenticated ? (
    <AssessmentPrompt />
  ) : (
    <SignedOutHome />
  );
}

/* -------------------------------------------------------------------------- */

function SignedInHome() {
  const navigate = useNavigate();
  const recommendations = useRecommendations();
  const clearHistory = useClearReadHistory();
  const { startWith, isPending: isStartingConversation } = useStartConversationFlow();

  return (
    <Stack gap="lg">
      <div>
        <Title order={1}>Welcome back</Title>
        <Text size="sm" c="dimmed" mt={4}>
          Search a company, or pick up a discussion we think is relevant to you.
        </Text>
      </div>

      <div className={styles.searchRow}>
        <SearchInput
          name="home-company-q"
          label="Search companies"
          placeholder="Search a company"
          onSearch={(query) => navigate(paths.companiesSearch(query))}
        />
        <SearchInput
          name="home-discussion-q"
          label="Search discussions"
          placeholder="Search a tag or post"
          onSearch={(query) => navigate(paths.discussionsSearch(query))}
        />
      </div>

      <Group gap="sm">
        <Button
          variant="light"
          leftSection={<Building2 size={16} aria-hidden="true" />}
          onClick={() => navigate(paths.companies())}
        >
          Browse companies
        </Button>
        <Button
          variant="light"
          leftSection={<MessagesSquare size={16} aria-hidden="true" />}
          onClick={() => navigate(paths.discussions())}
        >
          All discussions
        </Button>
      </Group>

      <section aria-labelledby="recommendations-heading">
        <Group justify="space-between" align="flex-end" mb="sm" wrap="wrap">
          <div>
            <Title id="recommendations-heading" order={2} size="var(--ship-text-xl)">
              Recommended for you
            </Title>
            {recommendations.data && recommendations.data.basedOnTags.length > 0 ? (
              <Group gap={6} mt={6} wrap="wrap">
                <Text size="xs" c="dimmed">
                  Based on your assessment:
                </Text>
                {recommendations.data.basedOnTags.slice(0, 6).map((tag) => (
                  <TagPill key={tag} tag={tag} asLink />
                ))}
              </Group>
            ) : null}
          </div>
          <Button
            variant="subtle"
            size="compact-sm"
            leftSection={<RefreshCw size={14} aria-hidden="true" />}
            onClick={() => void recommendations.refetch()}
            loading={recommendations.isFetching}
          >
            Refresh
          </Button>
        </Group>

        {recommendations.isPending ? (
          <LoadingState label="Finding discussions for you…" />
        ) : recommendations.isError ? (
          <ErrorState
            error={recommendations.error}
            onRetry={() => void recommendations.refetch()}
            isRetrying={recommendations.isFetching}
          />
        ) : recommendations.data.items.length === 0 ? (
          <Paper withBorder p="lg">
            <EmptyState
              icon={<Inbox size={28} aria-hidden="true" />}
              title={
                recommendations.data.totalMatching === 0
                  ? 'Nothing matches your topics yet'
                  : "You're all caught up"
              }
              description={
                recommendations.data.totalMatching === 0
                  ? 'No posts carry the tags you chose. Try browsing all discussions, or write the first post on one of your topics.'
                  : `You have opened all ${recommendations.data.totalMatching} posts that match your topics. Refreshing will not surface new ones until someone posts again, or until you change your answers.`
              }
              action={{
                label: 'Browse all discussions',
                onClick: () => navigate(paths.discussions()),
              }}
            />
            {recommendations.data.totalMatching > 0 ? (
              <Group justify="center" mt="sm">
                <Button
                  variant="subtle"
                  size="compact-xs"
                  onClick={() => clearHistory.mutate()}
                  loading={clearHistory.isPending}
                >
                  Demo: clear my read history
                </Button>
              </Group>
            ) : null}
          </Paper>
        ) : (
          <Stack gap="sm">
            {recommendations.data.items.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onStartConversation={
                  post.isOwn || isStartingConversation
                    ? undefined
                    : (target) => startWith(target.author.id)
                }
                messagingDisabledReason={post.isOwn ? 'This is your own post' : undefined}
              />
            ))}
            <Text size="xs" c="dimmed" ta="center">
              {recommendations.data.unseenRemaining - recommendations.data.items.length > 0
                ? `${recommendations.data.unseenRemaining - recommendations.data.items.length} more unseen posts match your topics.`
                : 'That is everything unseen that matches your topics right now.'}
            </Text>
          </Stack>
        )}
      </section>
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * Signed in but the assessment is unfinished.
 *
 * A prompt rather than a redirect: the assessment route redirects here when it
 * is done, so redirecting back would be a loop.
 */
function AssessmentPrompt() {
  const navigate = useNavigate();

  return (
    <Stack gap="lg" className={styles.narrow}>
      <Title order={1}>One quick step left</Title>
      <Alert color="ship" variant="light" icon={<Sparkles size={18} aria-hidden="true" />}>
        <Text size="sm">
          Answer five short questions and we will recommend discussions that match what you care
          about. It takes about a minute, and you can redo it any time.
        </Text>
      </Alert>
      <Group>
        <Button onClick={() => navigate(paths.assessment())}>Start the assessment</Button>
      </Group>
    </Stack>
  );
}

/* -------------------------------------------------------------------------- */

function SignedOutHome() {
  const navigate = useNavigate();
  const preview = usePublicPreview();

  return (
    <Stack gap="lg">
      <Paper withBorder p="xl" className={styles.hero}>
        <Stack gap="sm" maw={620}>
          <Title order={1}>Know what it is really like before you take the job.</Title>
          <Text size="sm" c="dimmed">
            SHIP collects what companies publish about pay, promotion, leave and support for women,
            keeps it separate from what employees report, and lets you compare two employers side by
            side.
          </Text>
          <Group mt="sm">
            <Button size="md" onClick={() => navigate(paths.login())}>
              Sign up
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            Your privacy comes first. Your email is never shown to other users.
          </Text>
        </Stack>
      </Paper>

      <Alert color="ship" variant="light" role="note">
        <Text size="sm">
          You are browsing signed out, so you can read the {PUBLIC_PREVIEW_POSTS_PER_TAG} most
          recent posts under each tag. Searching, company pages, comments and messages need an
          account.
        </Text>
      </Alert>

      <section aria-labelledby="preview-heading">
        <Title id="preview-heading" order={2} size="var(--ship-text-xl)" mb="sm">
          What people are discussing
        </Title>

        {preview.isPending ? (
          <LoadingState label="Loading discussions…" />
        ) : preview.isError ? (
          <ErrorState
            error={preview.error}
            onRetry={() => void preview.refetch()}
            isRetrying={preview.isFetching}
          />
        ) : preview.data.length === 0 ? (
          <EmptyState description="There's no related info yet." />
        ) : (
          <Stack gap="xl">
            {preview.data.map((group) => (
              <div key={group.tag}>
                <Group gap="xs" mb="sm">
                  <TagPill tag={group.tag} />
                  <Text size="xs" c="dimmed">
                    {formatTag(group.tag)} · newest {group.posts.length}
                  </Text>
                </Group>
                <Stack gap="sm">
                  {group.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      // Signed-out visitors cannot message or open a post, so
                      // the card links to sign-in instead of a dead end.
                      linkTo={paths.loginWithRedirect(paths.discussionDetail(post.id))}
                      messagingDisabledReason="Sign in to message this person"
                    />
                  ))}
                </Stack>
              </div>
            ))}
          </Stack>
        )}
      </section>
    </Stack>
  );
}
