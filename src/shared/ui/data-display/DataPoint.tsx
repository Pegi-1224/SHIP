import type { ReactNode } from 'react';
import { Button, Text } from '@mantine/core';
import { Lock } from 'lucide-react';
import { MIN_ELIGIBLE_CONTRIBUTORS } from '@/shared/config/constants';
import { NOT_REPORTED, formatCount } from '@/shared/utils/format';
import styles from './DataPoint.module.css';

export interface DataPointProps {
  label: string;
  /** Pre-formatted display value. Pass `null` for "not reported". */
  value: string | null;
  /** Qualifier that makes the number interpretable, e.g. "Base salary, FY2025". */
  caption?: ReactNode;
  size?: 'md' | 'lg';
}

/**
 * One labelled number.
 *
 * A `null` value renders the em dash plus "Not reported", never `0`. The
 * distinction matters: a company that does not publish its promotion rate is
 * not a company with a promotion rate of zero.
 */
export function DataPoint({ label, value, caption, size = 'md' }: DataPointProps) {
  const missing = value === null;
  return (
    <div className={styles.point}>
      <Text size="xs" c="dimmed" component="dt" className={styles.label}>
        {label}
      </Text>
      <Text
        component="dd"
        className={size === 'lg' ? styles.valueLg : styles.value}
        c={missing ? 'dimmed' : undefined}
      >
        {missing ? NOT_REPORTED : value}
        {missing ? <span className="ship-visually-hidden"> Not reported</span> : null}
      </Text>
      {caption ? (
        <Text size="xs" c="dimmed" className={styles.caption}>
          {caption}
        </Text>
      ) : null}
      {missing ? (
        <Text size="xs" c="dimmed" className={styles.caption}>
          Not reported
        </Text>
      ) : null}
    </div>
  );
}

export interface MissingDataNoticeProps {
  /** What is missing, e.g. "salary". */
  area: string;
  /** Opens the submission form with the company pre-filled (spec 6.5). */
  onShareData?: (() => void) | undefined;
}

/** Shown when a company exists but an area has no data at all (spec 6.5). */
export function MissingDataNotice({ area, onShareData }: MissingDataNoticeProps) {
  return (
    <div className={styles.notice}>
      <Text size="sm" c="dimmed">
        No data yet for {area}.
      </Text>
      {onShareData ? (
        <Button size="xs" variant="light" onClick={onShareData} mt="xs">
          Share your data
        </Button>
      ) : null}
    </div>
  );
}

export interface ThresholdNoticeProps {
  contributors: number;
  onShareData?: (() => void) | undefined;
}

/**
 * Shown instead of a user-reported aggregate while it is below the privacy
 * threshold (spec 3.5, 6.2, AC-6).
 *
 * The backend withholds the numbers; this only explains the gap. Never render
 * a hidden-but-downloaded aggregate here.
 */
export function ThresholdNotice({ contributors, onShareData }: ThresholdNoticeProps) {
  const remaining = Math.max(MIN_ELIGIBLE_CONTRIBUTORS - contributors, 0);
  return (
    <div className={styles.notice}>
      <Text size="sm" c="dimmed" className={styles.thresholdText}>
        <Lock size={14} aria-hidden="true" />
        <span>
          {contributors === 0
            ? 'No one has shared this yet.'
            : `${formatCount(contributors, 'submission')} so far.`}{' '}
          We show averages once {MIN_ELIGIBLE_CONTRIBUTORS} people have contributed, so no single
          person can be identified
          {remaining > 0 ? ` — ${remaining} to go` : ''}.
        </span>
      </Text>
      {onShareData ? (
        <Button size="xs" variant="light" onClick={onShareData} mt="xs">
          Share your data
        </Button>
      ) : null}
    </div>
  );
}
