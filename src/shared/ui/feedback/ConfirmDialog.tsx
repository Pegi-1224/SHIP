import type { ReactNode } from 'react';
import { Button, Group, Modal, Stack, Text } from '@mantine/core';

export interface ConfirmDialogProps {
  opened: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` paints the confirm button red for deletions. */
  tone?: 'default' | 'danger';
  isPending?: boolean;
  /**
   * Blocks the confirm button, e.g. until a confirmation phrase is typed.
   * Pair it with `confirmDisabledReason` so the control explains itself.
   */
  confirmDisabled?: boolean;
  confirmDisabledReason?: string;
  /** Shown inside the dialog when the action itself fails. */
  errorMessage?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The confirmation step required before every destructive action
 * (delete post, delete comment, delete account).
 *
 * Mantine's Modal traps focus, restores it to the trigger on close, labels the
 * dialog with its title and closes on Escape, so keyboard and screen-reader
 * behaviour comes for free. The confirm button is disabled while the action is
 * pending so a second click cannot fire the mutation twice.
 */
export function ConfirmDialog({
  opened,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'default',
  isPending = false,
  confirmDisabled = false,
  confirmDisabledReason,
  errorMessage = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={title}
      centered
      closeOnClickOutside={!isPending}
      closeOnEscape={!isPending}
    >
      <Stack gap="md">
        <Text size="sm" component="div">
          {description}
        </Text>

        {confirmDisabled && confirmDisabledReason ? (
          <Text size="xs" c="dimmed">
            {confirmDisabledReason}
          </Text>
        ) : null}

        {errorMessage ? (
          <Text size="sm" c="var(--ship-color-danger)" role="alert">
            {errorMessage}
          </Text>
        ) : null}

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button
            color={tone === 'danger' ? 'red' : 'ship'}
            onClick={onConfirm}
            loading={isPending}
            disabled={confirmDisabled || isPending}
            title={confirmDisabled ? confirmDisabledReason : undefined}
            data-autofocus
          >
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
