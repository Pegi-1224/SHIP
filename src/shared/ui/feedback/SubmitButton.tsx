import type { ReactNode } from 'react';
import { Button, type ButtonProps } from '@mantine/core';

export interface SubmitButtonProps extends Omit<ButtonProps, 'loading' | 'disabled' | 'type'> {
  /** True while the mutation is in flight. */
  isPending: boolean;
  /** Extra reason to block submission, e.g. nothing has been filled in yet. */
  disabled?: boolean;
  children: ReactNode;
  pendingLabel?: string;
}

/**
 * Submit control for every form.
 *
 * While a submission is pending the button is both `loading` and `disabled`,
 * which is what prevents a double click from firing the mutation twice. The
 * pending label is announced politely so screen-reader users hear that
 * something is happening.
 */
export function SubmitButton({
  isPending,
  disabled = false,
  children,
  pendingLabel = 'Submitting…',
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <>
      <Button {...buttonProps} type="submit" loading={isPending} disabled={disabled || isPending}>
        {children}
      </Button>
      <span className="ship-visually-hidden" role="status" aria-live="polite">
        {isPending ? pendingLabel : ''}
      </span>
    </>
  );
}
