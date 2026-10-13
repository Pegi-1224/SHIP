import type { ReactNode } from 'react';
import { Group, Stack, Text, Title } from '@mantine/core';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Primary call to action for the page. */
  action?: ReactNode;
  /** Breadcrumb or back link rendered above the title. */
  above?: ReactNode;
}

/** The `h1` and intro block every route-level page starts with. */
export function PageHeader({ title, description, action, above }: PageHeaderProps) {
  return (
    <header className={styles.header}>
      {above ? <div className={styles.above}>{above}</div> : null}
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
        <Stack gap={4} className={styles.text}>
          <Title order={1}>{title}</Title>
          {description ? (
            <Text size="sm" c="dimmed">
              {description}
            </Text>
          ) : null}
        </Stack>
        {action ? <div className={styles.action}>{action}</div> : null}
      </Group>
    </header>
  );
}
