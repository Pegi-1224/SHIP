import type { ReactNode } from 'react';
import styles from './QuestionShell.module.css';

export interface QuestionShellProps {
  stepIndex: number;
  totalSteps: number;
  question: string;
  hint?: string;
  optional?: boolean;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
}

/**
 * One assessment question per screen, with its progress indicator (spec 3.3).
 *
 * The progress bar is paired with a text equivalent ("Question 2 of 5", "40%") so the
 * position is not conveyed by a visual bar alone.
 */
export function QuestionShell({
  stepIndex,
  totalSteps,
  question,
  hint,
  optional = false,
  error,
  children,
  footer,
}: QuestionShellProps) {
  const percent = Math.round(((stepIndex + 1) / totalSteps) * 100);

  return (
    <div className={styles.shell}>
      <div className={styles.progressRow}>
        <p className={styles.progressText}>
          Question {stepIndex + 1} of {totalSteps}
          {optional ? ' · optional' : ''}
        </p>
        <p className={styles.progressText} aria-hidden="true">
          {percent}%
        </p>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`Progress: question ${stepIndex + 1} of ${totalSteps}`}
      >
        <div className={styles.fill} style={{ width: `${percent}%` }} />
      </div>

      <div className={styles.card}>
        <div>
          <h2 className={styles.question}>{question}</h2>
          {hint ? <p className={styles.hint}>{hint}</p> : null}
        </div>

        {children}

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.footer}>{footer}</div>
      </div>
    </div>
  );
}
