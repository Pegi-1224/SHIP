import { Button, Stack, Text, Title } from '@mantine/core';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { getErrorMessage, isApiError } from '@/shared/api';
import styles from './states.module.css';

export interface ErrorStateProps {
  /** The thrown value. Any shape is accepted; only safe text is rendered. */
  error?: unknown;
  title?: string;
  /** Overrides the message derived from `error`. */
  message?: string;
  /** Rendering a Retry button without this handler would be a dead control. */
  onRetry?: (() => void) | undefined;
  /** Disable Retry while a refetch is already running. */
  isRetrying?: boolean;
}

/**
 * The single error presentation, matching spec 4.2: red message plus a Retry
 * button. The caller keeps whatever the user had typed; this component never
 * unmounts a form.
 */
export function ErrorState({ error, title, message, onRetry, isRetrying = false }: ErrorStateProps) {
  const resolvedMessage = message ?? getErrorMessage(error);
  // A 404 or a validation error is not worth a Retry button.
  const retryable = !isApiError(error) || error.isRetryable;

  return (
    <div className={styles.block} role="alert">
      <Stack align="center" gap="sm" maw={460}>
        <AlertTriangle size={28} aria-hidden="true" className={styles.errorIcon} />
        {title ? (
          <Title order={3} size="var(--ship-text-lg)" ta="center">
            {title}
          </Title>
        ) : null}
        <Text size="sm" ta="center" className={styles.errorText}>
          {resolvedMessage}
        </Text>
        {onRetry && retryable ? (
          <Button
            variant="light"
            onClick={onRetry}
            loading={isRetrying}
            leftSection={<RotateCcw size={16} aria-hidden="true" />}
          >
            Retry
          </Button>
        ) : null}
      </Stack>
    </div>
  );
}
