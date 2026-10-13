import { Badge, CloseButton } from '@mantine/core';
import { Link } from 'react-router-dom';
import { formatTag } from '@/shared/utils/format';
import { paths } from '@/shared/config/paths';
import styles from './TagPill.module.css';

export interface TagPillProps {
  tag: string;
  /** Links to the filtered discussion feed. */
  asLink?: boolean;
  /** Renders a remove control, used inside TagSelector. */
  onRemove?: (() => void) | undefined;
  active?: boolean;
  size?: 'sm' | 'md';
}

/** A single `#tag` chip. */
export function TagPill({ tag, asLink = false, onRemove, active = false, size = 'sm' }: TagPillProps) {
  const label = formatTag(tag);

  if (onRemove) {
    return (
      <Badge
        variant="light"
        color="ship"
        size={size === 'sm' ? 'md' : 'lg'}
        className={styles.pill}
        rightSection={
          <CloseButton
            size="xs"
            variant="transparent"
            onClick={onRemove}
            aria-label={`Remove tag ${label}`}
          />
        }
      >
        {label}
      </Badge>
    );
  }

  if (asLink) {
    return (
      <Badge
        component={Link}
        to={paths.discussionsWithTag(tag)}
        variant={active ? 'filled' : 'light'}
        color="ship"
        size={size === 'sm' ? 'md' : 'lg'}
        className={styles.link}
      >
        {label}
      </Badge>
    );
  }

  return (
    <Badge variant={active ? 'filled' : 'light'} color="ship" size={size === 'sm' ? 'md' : 'lg'}>
      {label}
    </Badge>
  );
}
