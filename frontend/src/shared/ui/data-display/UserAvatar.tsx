import { avatarGradient } from '@/shared/utils/avatar';
import styles from './UserAvatar.module.css';

export interface UserAvatarProps {
  /** Shown to screen readers and as the tooltip. */
  name: string;
  avatarUrl: string | null;
  /** Any stable per-user string; picks the fallback gradient so it never changes between visits. */
  seed: string;
  size?: number;
}

/** A user's picture, or a gradient circle when they have none. */
export function UserAvatar({ name, avatarUrl, seed, size = 36 }: UserAvatarProps) {
  const dimensions = { width: size, height: size };

  if (avatarUrl) {
    return (
      <img className={styles.avatar} src={avatarUrl} alt={name} title={name} style={dimensions} />
    );
  }

  return (
    <span
      className={styles.avatar}
      role="img"
      aria-label={name}
      title={name}
      style={{ ...dimensions, backgroundImage: avatarGradient(seed) }}
    />
  );
}
