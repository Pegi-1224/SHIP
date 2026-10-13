/**
 * Transient success / failure feedback.
 *
 * Use this for confirmations that do not need their own screen region
 * ("Post published", "Data submitted"). Errors that the user must act on
 * belong inline next to the control, via `FormErrorAlert` or `ErrorState`.
 */
import { notifications } from '@mantine/notifications';
import { getErrorMessage } from '@/shared/api';

export function notifySuccess(message: string, title = 'Done'): void {
  notifications.show({
    title,
    message,
    color: 'teal',
    autoClose: 4000,
    withBorder: true,
  });
}

export function notifyError(error: unknown, title = 'Something went wrong'): void {
  notifications.show({
    title,
    message: getErrorMessage(error),
    color: 'red',
    autoClose: 6000,
    withBorder: true,
  });
}

export function notifyInfo(message: string, title?: string): void {
  notifications.show({
    title,
    message,
    color: 'ship',
    autoClose: 4000,
    withBorder: true,
  });
}
