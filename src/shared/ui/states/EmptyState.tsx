import type { ReactNode } from 'react';
import { Button, Stack, Text, Title } from '@mantine/core';
import styles from './states.module.css';

export interface EmptyStateProps {
  title?: string;
  /** Explain why it is empty and what the user can do next. */
  description?: ReactNode;
  /** Optional call to action, e.g. "Share your data" on an empty company metric. */
  action?: { label: string; onClick: () => void } | undefined;
  icon?: ReactNode;
}

/**
 * Shown when a request succeeded but returned nothing.
 *
 * The default copy is the wording from spec 4.2. An empty state must never be
 * confused with an error: there is nothing to retry here.
 */
export function EmptyState({
  title,
  description = "There's no related info yet.",
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className={styles.block}>
      <Stack align="center" gap="sm" maw={420}>
        {icon ? <div className={styles.icon}>{icon}</div> : null}
        {title ? (
          <Title order={3} size="var(--ship-text-lg)" ta="center">
            {title}
          </Title>
        ) : null}
        <Text size="sm" c="dimmed" ta="center">
          {description}
        </Text>
        {action ? (
          <Button variant="light" onClick={action.onClick} mt="xs">
            {action.label}
          </Button>
        ) : null}
      </Stack>
    </div>
  );
}
