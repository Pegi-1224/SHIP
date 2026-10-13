import type { ReactNode } from 'react';
import { Paper, Progress, Stack, Text, Title } from '@mantine/core';
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
 * The progress bar is paired with a text equivalent ("Question 2 of 5") so the
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
  const percent = ((stepIndex + 1) / totalSteps) * 100;

  return (
    <Stack gap="md" className={styles.shell}>
      <div>
        <Text size="sm" c="dimmed" mb={6}>
          Question {stepIndex + 1} of {totalSteps}
          {optional ? ' · optional' : ''}
        </Text>
        <Progress
          value={percent}
          size="sm"
          color="ship"
          aria-label={`Progress: question ${stepIndex + 1} of ${totalSteps}`}
        />
      </div>

      <Paper withBorder p="lg">
        <Stack gap="md">
          <div>
            <Title order={2} size="var(--ship-text-xl)">
              {question}
            </Title>
            {hint ? (
              <Text size="sm" c="dimmed" mt={4}>
                {hint}
              </Text>
            ) : null}
          </div>

          {children}

          {error ? (
            <Text size="sm" c="var(--ship-color-danger)" role="alert">
              {error}
            </Text>
          ) : null}
        </Stack>
      </Paper>

      {footer}
    </Stack>
  );
}
