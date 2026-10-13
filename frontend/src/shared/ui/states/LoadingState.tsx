import { Loader, Stack, Text } from '@mantine/core';
import styles from './states.module.css';

export interface LoadingStateProps {
  /** Announced to screen readers and shown under the spinner. */
  label?: string;
  /** `inline` for a small area, `block` for a whole page region. */
  variant?: 'inline' | 'block';
}

/**
 * The single loading indicator used across the app.
 *
 * `role="status"` plus `aria-live="polite"` means a screen reader announces
 * the wait without stealing focus.
 */
export function LoadingState({ label = 'Loading…', variant = 'block' }: LoadingStateProps) {
  return (
    <div
      className={variant === 'block' ? styles.block : styles.inline}
      role="status"
      aria-live="polite"
    >
      <Stack align="center" gap="sm">
        <Loader size={variant === 'block' ? 'md' : 'sm'} color="ship" />
        <Text size="sm" c="dimmed">
          {label}
        </Text>
      </Stack>
    </div>
  );
}
