import { Avatar, UnstyledButton } from '@mantine/core';
import type { AnonymousIdentity } from '@/shared/types/common';
import styles from './AnonymousAvatar.module.css';

export interface AnonymousAvatarProps {
  identity: AnonymousIdentity;
  size?: number;
  /**
   * Makes the avatar a button that starts a direct message (spec 3.4).
   * Without it the avatar is decorative and not focusable.
   */
  onStartConversation?: (() => void) | undefined;
  disabledReason?: string;
}

function initials(label: string): string {
  const words = label.split(' ').filter(Boolean);
  const last = words[words.length - 1] ?? label;
  return last.slice(0, 2).toUpperCase();
}

/**
 * The only identity shown next to a post, comment or message.
 *
 * It renders a generated label such as "Anonymous Finch" and a deterministic
 * colour. Real names and email addresses are never passed to this component
 * and must never be sent to other users by the backend either.
 */
export function AnonymousAvatar({
  identity,
  size = 36,
  onStartConversation,
  disabledReason,
}: AnonymousAvatarProps) {
  const avatar = (
    <Avatar size={size} radius="xl" color="ship" style={{ backgroundColor: identity.color }}>
      <span className={styles.initials}>{initials(identity.label)}</span>
    </Avatar>
  );

  if (!onStartConversation) {
    return (
      <span className={styles.static} title={identity.label}>
        {avatar}
      </span>
    );
  }

  return (
    <UnstyledButton
      className={styles.button}
      onClick={onStartConversation}
      disabled={Boolean(disabledReason)}
      title={disabledReason ?? `Message ${identity.label}`}
      aria-label={disabledReason ?? `Message ${identity.label}`}
    >
      {avatar}
    </UnstyledButton>
  );
}
