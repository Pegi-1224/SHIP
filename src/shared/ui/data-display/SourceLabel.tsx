import { Anchor, Group, Text } from '@mantine/core';
import { ExternalLink } from 'lucide-react';
import type { DataSourceKind, PublicSourceMeta } from '@/shared/types/company';
import { formatDate, formatCount, formatHostname } from '@/shared/utils/format';
import styles from './SourceLabel.module.css';

export interface SourceLabelProps {
  kind: DataSourceKind;
  /** Publisher, link, last-updated date and period. Public data only. */
  source?: PublicSourceMeta | null;
  /** Eligible contributor count. User-reported data only. */
  contributors?: number | null;
  /** Most recent user submission date. User-reported data only. */
  lastSubmittedAt?: string | null;
}

/**
 * The provenance badge that must appear beside every number on a company page
 * (spec 3.5, AC-5). Public data and user-reported data never share a badge,
 * a colour or a row.
 */
export function SourceLabel({ kind, source, contributors, lastSubmittedAt }: SourceLabelProps) {
  if (kind === 'public') {
    return (
      <div className={styles.root}>
        <Group gap={6} wrap="wrap">
          <span className={`${styles.badge} ${styles.public}`}>Public data</span>
          {source ? (
            <Text span size="xs" c="dimmed">
              {source.reportingPeriod}
            </Text>
          ) : null}
        </Group>
        {source ? (
          <Text size="xs" c="dimmed" className={styles.meta}>
            <Anchor
              href={source.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="xs"
              className={styles.link}
            >
              {source.sourceName || formatHostname(source.sourceUrl)}
              <ExternalLink size={12} aria-hidden="true" className={styles.linkIcon} />
              <span className="ship-visually-hidden"> (opens in a new tab)</span>
            </Anchor>
            {' · '}
            Last updated: {formatDate(source.lastUpdated)}
          </Text>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Group gap={6} wrap="wrap">
        <span className={`${styles.badge} ${styles.user}`}>User reported</span>
        {typeof contributors === 'number' ? (
          <Text span size="xs" c="dimmed">
            {formatCount(contributors, 'submission')}
          </Text>
        ) : null}
      </Group>
      {lastSubmittedAt ? (
        <Text size="xs" c="dimmed" className={styles.meta}>
          Last submitted: {formatDate(lastSubmittedAt)}
        </Text>
      ) : null}
    </div>
  );
}
