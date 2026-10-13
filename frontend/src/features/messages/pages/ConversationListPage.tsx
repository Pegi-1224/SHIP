import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * The conversation list (`/messages`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/shared/ui` - `AnonymousAvatar`
 *   - `src/features/messages/hooks/useMessages.ts` - `useConversations`
 *
 * There is no seeded conversation id in the mock fixtures: conversations are
 * created at runtime when someone messages a post's author (see
 * `src/features/messages/hooks/useStartConversationFlow.ts`). Open the
 * Discussions starter page and use that flow once its UI exists, or call
 * `startConversation` from `src/features/messages/api/messagesApi.ts`
 * directly while developing.
 */
export function ConversationListPage() {
  return (
    <StarterPage
      title="Messages"
      description="This page will show the list of anonymous conversations for the signed-in user."
      sourceFile="src/features/messages/pages/ConversationListPage.tsx"
    >
      <RelatedLinks
        links={[
          { to: paths.discussions(), label: 'Discussions (where conversations start)' },
          { to: paths.home(), label: 'Home' },
        ]}
      />
    </StarterPage>
  );
}
