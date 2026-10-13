import { Link, useNavigate } from 'react-router-dom';
import {
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import { LogOut, RefreshCcw, RotateCcw } from 'lucide-react';
import { env } from '@/shared/config/env';
import { paths } from '@/shared/config/paths';
import {
  LoadingState,
  PageHeader,
  PostCard,
  QueryStateView,
  notifyInfo,
} from '@/shared/ui';
import { formatDate, formatRelativeTime, truncate } from '@/shared/utils/format';
import { METRIC_AREA_LABELS } from '@/shared/types/company';
import { useAuth } from '@/app/providers/useAuth';
import { useSignOut } from '@/features/auth';
import { useMySubmissions } from '@/features/companies';
import { DeleteAccountSection } from '../components/DeleteAccountSection';
import { useMyComments, useMyPosts, useProfileActivity } from '../hooks/useProfile';
import styles from './ProfilePage.module.css';

/**
 * Account, contributions and account controls (spec 3.6, 3.9).
 *
 * The name and email here are visible to this user only. Nothing on this page
 * is shown to anyone else - other people only ever see the anonymous identity.
 */
export function ProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const signOut = useSignOut();

  const activity = useProfileActivity();
  const posts = useMyPosts();
  const comments = useMyComments();
  const submissions = useMySubmissions();

  if (!user) return <LoadingState label="Loading your profile…" />;

  return (
    <Stack gap="lg" className={styles.page}>
      <PageHeader
        title="Your profile"
        description="Only you can see the details on this page."
        action={
          <Button
            variant="light"
            leftSection={<LogOut size={16} aria-hidden="true" />}
            onClick={() => signOut.mutate()}
            loading={signOut.isPending}
          >
            Sign out
          </Button>
        }
      />

      <Paper withBorder p="lg" component="section">
        <Stack gap="sm">
          <Title order={2} size="var(--ship-text-lg)">
            Account
          </Title>
          <dl className={styles.details}>
            <div>
              <dt>Name</dt>
              <dd>{user.displayName}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div>
              <dt>Anonymous name</dt>
              <dd>
                {user.anonymousIdentity.label}
                <Text span size="xs" c="dimmed" ml={6}>
                  (this is what other people see)
                </Text>
              </dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>{formatDate(user.createdAt)}</dd>
            </div>
            <div>
              <dt>Sign-in method</dt>
              <dd>
                {user.authProvider === 'google_mock'
                  ? 'Google (simulated)'
                  : 'Email code (simulated)'}
              </dd>
            </div>
          </dl>

          <Text size="xs" c="dimmed">
            This build has no password: sign-in is a one-time code sent to your email address. See
            the known limitations in the README for the open question about the password-change
            screen named in the specification.
          </Text>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" component="section">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <div>
            <Title order={2} size="var(--ship-text-lg)">
              Assessment
            </Title>
            <Text size="sm" c="dimmed" mt={4}>
              Your answers decide which discussions we recommend on your home page.
            </Text>
          </div>
          <Button
            variant="light"
            leftSection={<RotateCcw size={16} aria-hidden="true" />}
            onClick={() => navigate(paths.assessment())}
          >
            Retake assessment
          </Button>
        </Group>
      </Paper>

      <Paper withBorder p="lg" component="section">
        <Title order={2} size="var(--ship-text-lg)" mb="md">
          Your contributions
        </Title>

        {activity.data ? (
          <Group gap="xl" mb="md">
            <Stat label="Posts" value={activity.data.postCount} />
            <Stat label="Comments" value={activity.data.commentCount} />
            <Stat label="Company submissions" value={activity.data.submissionCount} />
          </Group>
        ) : null}

        <Tabs defaultValue="posts">
          <Tabs.List>
            <Tabs.Tab value="posts">Posts</Tabs.Tab>
            <Tabs.Tab value="comments">Comments</Tabs.Tab>
            <Tabs.Tab value="submissions">Company data</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="posts" pt="md">
            <QueryStateView
              query={posts}
              loadingLabel="Loading your posts…"
              isEmpty={(data) => data.items.length === 0}
              emptyProps={{
                title: 'No posts yet',
                description: 'Anything you write will appear here.',
              }}
            >
              {(data) => (
                <Stack gap="sm">
                  {data.items.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </Stack>
              )}
            </QueryStateView>
          </Tabs.Panel>

          <Tabs.Panel value="comments" pt="md">
            <QueryStateView
              query={comments}
              loadingLabel="Loading your comments…"
              isEmpty={(data) => data.items.length === 0}
              emptyProps={{
                title: 'No comments yet',
                description: 'Comments you leave on other posts will appear here.',
              }}
            >
              {(data) => (
                <Stack gap="xs">
                  {data.items.map((comment) => (
                    <Paper key={comment.id} withBorder p="md">
                      <Text size="xs" c="dimmed">
                        {formatRelativeTime(comment.createdAt)}
                      </Text>
                      <Text size="sm" mt={4} className={styles.commentText}>
                        {truncate(comment.body, 240)}
                      </Text>
                      <Anchor
                        component={Link}
                        to={paths.discussionDetail(comment.postId)}
                        size="xs"
                        mt={6}
                        display="inline-block"
                      >
                        View the post
                      </Anchor>
                    </Paper>
                  ))}
                </Stack>
              )}
            </QueryStateView>
          </Tabs.Panel>

          <Tabs.Panel value="submissions" pt="md">
            <QueryStateView
              query={submissions}
              loadingLabel="Loading your submissions…"
              isEmpty={(data) => data.length === 0}
              emptyProps={{
                title: 'No company data shared yet',
                description:
                  'Open a company page and use "Share your data" to contribute what you know.',
              }}
            >
              {(entries) => (
                <Stack gap="xs">
                  {entries.map((entry) => (
                    <Paper key={entry.id} withBorder p="md">
                      <Group justify="space-between" wrap="wrap" gap="sm">
                        <div>
                          <Anchor
                            component={Link}
                            to={paths.companyDetail(entry.companyId)}
                            size="sm"
                            fw={600}
                          >
                            {entry.companyName}
                          </Anchor>
                          <Text size="xs" c="dimmed" mt={2}>
                            {entry.areas.map((area) => METRIC_AREA_LABELS[area]).join(', ')}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Submitted {formatDate(entry.createdAt)}
                            {entry.updatedAt !== entry.createdAt
                              ? ` · edited ${formatDate(entry.updatedAt)}`
                              : ''}
                          </Text>
                        </div>
                        <Group gap="xs">
                          {entry.isSuperseded ? (
                            <Badge size="sm" variant="light" color="gray">
                              Replaced by a newer submission
                            </Badge>
                          ) : (
                            <Badge size="sm" variant="light" color="teal">
                              Counted in averages
                            </Badge>
                          )}
                          {!entry.isSuperseded ? (
                            <Button
                              size="xs"
                              variant="subtle"
                              onClick={() => navigate(paths.companySubmit(entry.companyId))}
                            >
                              Edit
                            </Button>
                          ) : null}
                        </Group>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              )}
            </QueryStateView>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {env.enableMocks ? <DemoToolsSection /> : null}

      <DeleteAccountSection />
    </Stack>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <Text size="var(--ship-text-2xl)" fw={700}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </div>
  );
}

/**
 * Demo-only controls, shown while the app runs on mocks.
 *
 * The mock database is kept in `localStorage` so a reload does not wipe the
 * demo. This button puts it back to the seeded state.
 */
function DemoToolsSection() {
  return (
    <Paper withBorder p="lg" component="section">
      <Stack gap="sm">
        <Title order={2} size="var(--ship-text-lg)">
          Demo tools
        </Title>
        <Text size="sm" c="dimmed">
          This build runs on an in-browser mock API. Its data is stored in this browser only and
          survives a page reload. Resetting puts every company, post, submission and message back to
          the seeded state and signs you out.
        </Text>
        <div>
          <Button
            variant="light"
            leftSection={<RefreshCcw size={16} aria-hidden="true" />}
            onClick={() => {
              notifyInfo('Resetting the demo data…');
              // Imported lazily so the mock database never reaches a real-API build.
              void import('@/mocks/db').then(({ resetMockDatabase }) => {
                resetMockDatabase();
                window.sessionStorage.clear();
                window.location.assign(paths.home());
              });
            }}
          >
            Reset demo data
          </Button>
        </div>
      </Stack>
    </Paper>
  );
}
