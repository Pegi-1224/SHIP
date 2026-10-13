import { useParams } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { RelatedLinks, StarterPage } from '@/shared/ui';

/**
 * One conversation thread (`/messages/:conversationId`).
 *
 * Reusable, already-wired building blocks for the real design:
 *   - `src/features/messages/hooks/useMessages.ts` - `useConversation`
 *     (polls every 5s while open - see its doc comment for the real-time
 *     integration point), `useSendMessage`
 *   - The send flow already implements the idempotency and retry rules from
 *     the spec (`clientMessageId`, no duplicate on retry) - see
 *     `src/features/messages/api/messagesApi.ts`
 */
export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();

  return (
    <StarterPage
      title="Conversation"
      description="This page will show the message history and composer for one anonymous conversation."
      sourceFile="src/features/messages/pages/ConversationPage.tsx"
      routeValues={{ conversationId }}
    >
      <RelatedLinks links={[{ to: paths.messages(), label: 'Back to messages' }]} />
    </StarterPage>
  );
}
