import type { ReactNode } from 'react';
import { Text } from '@mantine/core';
import styles from './metrics.module.css';

export interface MetricBranchesProps {
  /** The curated public-data column. */
  publicBranch: ReactNode;
  /** The user-reported column. */
  userBranch: ReactNode;
}

/**
 * Side-by-side layout for the two data sources of one metric area.
 *
 * The two columns are never merged, averaged together, or allowed to fall back
 * to one another silently. On narrow screens they stack, keeping their colour
 * coding and their own `SourceLabel`.
 */
export function MetricBranches({ publicBranch, userBranch }: MetricBranchesProps) {
  return (
    <div className={styles.branches}>
      <div className={`${styles.branch} ${styles.publicBranch}`}>
        <Text size="xs" fw={700} c="var(--ship-source-public)" tt="uppercase">
          Public data
        </Text>
        {publicBranch}
      </div>
      <div className={`${styles.branch} ${styles.userBranch}`}>
        <Text size="xs" fw={700} c="var(--ship-source-user)" tt="uppercase">
          User reported
        </Text>
        {userBranch}
      </div>
    </div>
  );
}
