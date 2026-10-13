import { useId, type ReactNode } from 'react';
import { Paper, Stack, Text, Title } from '@mantine/core';
import styles from './MetricCard.module.css';

export interface MetricCardProps {
  title: string;
  /** One line explaining what the area measures. */
  description?: string;
  icon?: ReactNode;
  /** Rendered top-right, e.g. a "Share your data" button. */
  action?: ReactNode;
  children: ReactNode;
  /** Used by the comparison page to label which company the card belongs to. */
  headingLevel?: 2 | 3 | 4;
}

/**
 * Container for one metric area on a company profile or comparison page.
 *
 * The section is named by its own heading via `aria-labelledby`, so screen
 * reader users can navigate between the five areas by landmark instead of
 * reading the whole page in order.
 *
 * It owns the heading and the frame only. What goes inside - a public-data
 * block, a user-reported block, a missing-data notice - is the caller's
 * decision, because the five areas report different things.
 */
export function MetricCard({
  title,
  description,
  icon,
  action,
  children,
  headingLevel = 3,
}: MetricCardProps) {
  const headingId = useId();

  return (
    <Paper component="section" aria-labelledby={headingId} withBorder p="lg" className={styles.card}>
      <div className={styles.header}>
        <div className={styles.heading}>
          {icon ? (
            <span className={styles.icon} aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div>
            <Title id={headingId} order={headingLevel} size="var(--ship-text-lg)">
              {title}
            </Title>
            {description ? (
              <Text size="xs" c="dimmed" mt={2}>
                {description}
              </Text>
            ) : null}
          </div>
        </div>
        {action ? <div className={styles.action}>{action}</div> : null}
      </div>

      <Stack gap="md" mt="md">
        {children}
      </Stack>
    </Paper>
  );
}
