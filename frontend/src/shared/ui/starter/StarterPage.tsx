import type { ReactNode } from 'react';
import { Code, Stack, Text, Title } from '@mantine/core';
import styles from './StarterPage.module.css';

export interface StarterPageProps {
  /** The page's name, e.g. "Company Profile". Rendered as "<title> — Starter Page". */
  title: string;
  /** One or two sentences describing what this page will eventually do. */
  description: string;
  /**
   * Repo-relative path to this page's source file, so a developer picking up
   * the ticket knows exactly where to start editing.
   */
  sourceFile: string;
  /**
   * Resolved route parameters or query values, shown as simple key/value text
   * so a developer can see real data flowing through the route without the
   * page having to fetch anything.
   */
  routeValues?: Record<string, string | null | undefined>;
  /**
   * Minimal navigation or development controls for reaching related pages
   * (e.g. `<RelatedLinks />`, a dev-only sign-in shortcut). Optional.
   */
  children?: ReactNode;
}

/**
 * The placeholder every route renders until its real design is implemented.
 *
 * This is intentionally plain: no cards, no charts, no sample content. It
 * exists so the route, its guards, its params and its navigation all keep
 * working while the actual page UI is designed and built separately. See
 * README.md "How to replace a placeholder with a real page" for the handoff
 * steps, and docs/feature-checklist.md for what is implemented versus pending
 * for this feature.
 */
export function StarterPage({
  title,
  description,
  sourceFile,
  routeValues,
  children,
}: StarterPageProps) {
  const values = routeValues
    ? Object.entries(routeValues).filter(([, value]) => value !== undefined)
    : [];

  return (
    <div className={styles.page}>
      <Stack gap="sm">
        <Text size="xs" tt="uppercase" fw={700} c="dimmed" className={styles.eyebrow}>
          Starter page
        </Text>

        <Title order={1} size="var(--ship-text-2xl)">
          {title}
        </Title>

        <Text size="sm">{description}</Text>

        <Text size="sm" c="dimmed">
          Replace this placeholder when the UI design is ready.
        </Text>

        <Text size="xs" c="dimmed" className={styles.source}>
          Source file: <Code>{sourceFile}</Code>
        </Text>

        {values.length > 0 ? (
          <dl className={styles.values}>
            {values.map(([key, value]) => (
              <div key={key} className={styles.valueRow}>
                <dt>{key}</dt>
                <dd>{value === null || value === '' ? <em>none</em> : <Code>{value}</Code>}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children ? <div className={styles.controls}>{children}</div> : null}
      </Stack>
    </div>
  );
}
