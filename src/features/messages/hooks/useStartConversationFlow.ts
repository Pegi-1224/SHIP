import { useNavigate } from 'react-router-dom';
import { paths } from '@/shared/config/paths';
import { notifyError } from '@/shared/ui';
import { useStartConversation } from './useMessages';

/**
 * "Message this author" behaviour, shared by the discussion feed, post detail
 * and home recommendations (spec 3.4, 5.3).
 *
 * It exists so three call sites do not each re-implement open-or-create plus
 * navigation. The caller passes the author's anonymous id and nothing else.
 */
export function useStartConversationFlow() {
  const navigate = useNavigate();
  const startConversation = useStartConversation();

  const startWith = (anonymousId: string) => {
    startConversation.mutate(
      { anonymousId },
      {
        onSuccess: (conversation) => navigate(paths.conversation(conversation.id)),
        onError: (error) => notifyError(error, 'We could not open that conversation'),
      },
    );
  };

  return { startWith, isPending: startConversation.isPending };
}
