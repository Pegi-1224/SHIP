import { Alert, Button, Group, Text } from '@mantine/core';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { getErrorMessage, isApiError } from '@/shared/api';

export interface FormErrorAlertProps {
  error: unknown;
  /** Retry handler. Submitting again must not clear what the user typed. */
  onRetry?: (() => void) | undefined;
  isRetrying?: boolean;
}

/**
 * Inline error banner for a form that failed to submit (spec 4.2, 5.5, AC-10).
 *
 * Crucially this renders *next to* the form rather than replacing it, so the
 * user's input survives the failure and Retry can resubmit the same values.
 */
export function FormErrorAlert({ error, onRetry, isRetrying = false }: FormErrorAlertProps) {
  if (!error) return null;

  const retryable = !isApiError(error) || error.isRetryable;

  return (
    <Alert
      color="red"
      variant="light"
      icon={<AlertTriangle size={18} aria-hidden="true" />}
      role="alert"
      title="Something went wrong"
    >
      <Text size="sm">{getErrorMessage(error)}</Text>
      {onRetry && retryable ? (
        <Group mt="sm">
          <Button
            size="xs"
            variant="light"
            color="red"
            onClick={onRetry}
            loading={isRetrying}
            leftSection={<RotateCcw size={14} aria-hidden="true" />}
          >
            Retry
          </Button>
        </Group>
      ) : null}
    </Alert>
  );
}
