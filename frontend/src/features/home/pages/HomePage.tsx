import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button, Group, Stack, Text, TextInput, Title } from '@mantine/core';
import { env } from '@/shared/config/env';
import { paths } from '@/shared/config/paths';
import { FormErrorAlert, RelatedLinks, StarterPage } from '@/shared/ui';
import { useAuth } from '@/app/providers/useAuth';
import { useDevSignIn, useSignOut } from '@/features/auth';
import { CompanyDemoResults } from '@/features/companies';
import { PostDemoResults } from '@/features/discussions';
import { useDevCompleteAssessment } from '@/features/onboarding';

/**
 * Home (`/`).
 *
 * This is also the development index for the whole app: every registered
 * route is listed below, with worked examples for the routes that need an
 * id. Routes behind a guard are listed anyway - following one while signed
 * out, or before finishing the assessment, exercises the guard's redirect,
 * which is useful to see too.
 */
export function HomePage() {
  const { status, user } = useAuth();
  // Typed into the header's company search, which keeps `?q=` up to date.
  const [searchParams] = useSearchParams();
  const companyQuery = (searchParams.get('q') ?? '').trim();

  return (
    <Stack gap="xl">
      {/* Discussion posts by default; matching companies only while searching. */}
      {companyQuery ? (
        <Stack component="section" gap="sm" maw={760} aria-labelledby="home-company-results">
          <Title order={2} size="var(--ship-text-xl)" id="home-company-results">
            Companies
          </Title>
          <CompanyDemoResults query={companyQuery} />
        </Stack>
      ) : (
        <Stack component="section" gap="sm" maw={760} aria-labelledby="home-latest-posts">
          <Title order={2} size="var(--ship-text-xl)" id="home-latest-posts">
            Latest discussions
          </Title>
          <PostDemoResults query="" />
        </Stack>
      )}

      <StarterPage
        title="Home"
        description="This page will provide the company and discussion search entry points, along with personalized recommendations for signed-in users."
        sourceFile="src/features/home/pages/HomePage.tsx"
      >
        <SessionPanel
          status={status}
          email={user?.email}
          hasCompletedAssessment={user?.hasCompletedAssessment}
        />
        <DevIndex />
      </StarterPage>
    </Stack>
  );
}

interface SessionPanelProps {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  email?: string;
  hasCompletedAssessment?: boolean;
}

/** Shows the current dev session and, when signed out, the dev sign-in shortcut. */
function SessionPanel({ status, email, hasCompletedAssessment }: SessionPanelProps) {
  const [devEmail, setDevEmail] = useState('dev@example.com');
  const devSignIn = useDevSignIn();
  const signOut = useSignOut();

  if (status === 'loading') {
    return <Text size="sm">Checking session…</Text>;
  }

  if (status === 'authenticated') {
    return (
      <Group justify="space-between" wrap="wrap">
        <Text size="sm">
          Signed in as <strong>{email}</strong>.{' '}
          {hasCompletedAssessment
            ? 'Assessment completed.'
            : 'Assessment not completed yet - open the Assessment starter page below.'}
        </Text>
        <Button
          size="xs"
          variant="light"
          onClick={() => signOut.mutate()}
          loading={signOut.isPending}
        >
          Sign out
        </Button>
      </Group>
    );
  }

  if (!env.enableMocks) {
    return (
      <Text size="sm" c="dimmed">
        Not signed in. The dev sign-in shortcut is disabled because this build is configured for a
        real backend (<code>VITE_ENABLE_MOCKS=false</code>). Use the real sign-in flow once it is
        implemented at <code>/login</code>.
      </Text>
    );
  }

  return (
    <Stack gap="xs">
      <Text size="sm">
        Not signed in. Development-only shortcut: signs in through the real mock sign-in endpoints
        (no form to fill in). Disabled whenever <code>VITE_ENABLE_MOCKS=false</code>, which is also
        the production setting.
      </Text>
      <Group gap="xs" wrap="wrap">
        <TextInput
          size="xs"
          value={devEmail}
          onChange={(event) => setDevEmail(event.currentTarget.value)}
          aria-label="Dev sign-in email"
          w={220}
        />
        <Button
          size="xs"
          loading={devSignIn.isPending}
          disabled={devSignIn.isPending || devEmail.trim().length === 0}
          onClick={() => devSignIn.mutate(devEmail)}
        >
          Dev sign in (mock)
        </Button>
      </Group>
      <FormErrorAlert
        error={devSignIn.error}
        onRetry={() => devSignIn.mutate(devEmail)}
        isRetrying={devSignIn.isPending}
      />
    </Stack>
  );
}

/** Lets a developer complete the assessment from here too, without a second click into /assessment. */
function AssessmentShortcut() {
  const { user } = useAuth();
  const devComplete = useDevCompleteAssessment();

  if (!user || user.hasCompletedAssessment || !env.enableMocks) return null;

  return (
    <Group gap="xs">
      <Text size="xs" c="dimmed">
        Quick unblock:
      </Text>
      <Button
        size="xs"
        variant="light"
        loading={devComplete.isPending}
        onClick={() => devComplete.mutate()}
      >
        Dev: complete assessment with default answers
      </Button>
    </Group>
  );
}

const EXAMPLE_COMPANY_ID = 'northwind-systems';
/** Company pages read the demo JSON data, which has its own ids. */
const EXAMPLE_DEMO_COMPANY_ID = 'lumen-harbor-analytics';
const EXAMPLE_COMPANY_ID_B = 'harborline-financial';
const EXAMPLE_POST_ID = 'post_seed_1';

function DevIndex() {
  return (
    <Stack gap="md">
      <Text size="xs" fw={700} tt="uppercase" c="dimmed">
        All starter pages
      </Text>
      <Text size="xs" c="dimmed">
        Routes marked "guarded" need a signed-in session; routes marked "+ assessment" also need the
        assessment completed. Use the dev sign-in shortcut above to reach them.
      </Text>

      <RelatedLinks
        heading="Public"
        links={[
          { to: paths.home(), label: 'Home (this page)' },
          { to: paths.login(), label: 'Login' },
          { to: '/this-route-does-not-exist', label: 'Not found (example)' },
        ]}
      />

      <div>
        <RelatedLinks
          heading="Onboarding (guarded)"
          links={[{ to: paths.assessment(), label: 'Assessment' }]}
        />
        <AssessmentShortcut />
      </div>

      <RelatedLinks
        heading="Companies (guarded + assessment)"
        links={[
          { to: paths.companies(), label: 'Company search' },
          { to: paths.companyNew(), label: 'Add a company' },
          {
            to: paths.companyDetail(EXAMPLE_DEMO_COMPANY_ID),
            label: `Company page (example: ${EXAMPLE_DEMO_COMPANY_ID})`,
          },
          {
            to: paths.companySubmit(EXAMPLE_COMPANY_ID),
            label: `Company data submission (example: ${EXAMPLE_COMPANY_ID})`,
          },
          {
            to: paths.compareCompanies(EXAMPLE_COMPANY_ID, EXAMPLE_COMPANY_ID_B),
            label: `Compare (example: ${EXAMPLE_COMPANY_ID} vs ${EXAMPLE_COMPANY_ID_B})`,
          },
        ]}
      />

      <RelatedLinks
        heading="Discussions (guarded + assessment)"
        links={[
          { to: paths.discussions(), label: 'Discussion feed' },
          { to: paths.discussionNew(), label: 'New post' },
          {
            to: paths.discussionDetail(EXAMPLE_POST_ID),
            label: `Post detail (example: ${EXAMPLE_POST_ID})`,
          },
          {
            to: paths.discussionEdit(EXAMPLE_POST_ID),
            label: `Edit post (example: ${EXAMPLE_POST_ID})`,
          },
        ]}
      />

      <div>
        <RelatedLinks
          heading="Messages (guarded + assessment)"
          links={[{ to: paths.messages(), label: 'Conversation list' }]}
        />
        <Text size="xs" c="dimmed" mt={4}>
          There is no seeded conversation id: conversations are created at runtime when someone
          messages a post's author. Open the conversation list to see the empty state, or see{' '}
          <code>src/features/messages/hooks/useStartConversationFlow.ts</code> for how one gets
          created.
        </Text>
      </div>

      <RelatedLinks heading="Account" links={[{ to: paths.profile(), label: 'Profile' }]} />
    </Stack>
  );
}
