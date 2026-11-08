import { useState } from 'react';
import { Checkbox, Modal } from '@mantine/core';
import { Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/shared/api';
import { useDeleteAccount } from '@/features/auth';
import styles from './DeleteAccountDialog.module.css';

export interface DeleteAccountDialogProps {
  opened: boolean;
  onClose: () => void;
}

/**
 * Account deletion (spec 3.9, AC-9; UI design, Nov 2026).
 *
 * The page behind is blurred, and the delete button stays disabled until the user ticks "I
 * understand this can't be undone". The frontend sends one request: the server removes the
 * posts, every comment on them, the user's comments elsewhere and the company data they shared
 * in a single operation. The client could not do it correctly itself - it cannot see other
 * people's comments on its posts, and a partial failure would orphan records.
 *
 * On success `useDeleteAccount` clears the session and goes Home.
 */
export function DeleteAccountDialog({ opened, onClose }: DeleteAccountDialogProps) {
  const deleteAccount = useDeleteAccount();
  const [understood, setUnderstood] = useState(false);

  const close = () => {
    if (deleteAccount.isPending) return;
    setUnderstood(false);
    deleteAccount.reset();
    onClose();
  };

  return (
    <Modal.Root opened={opened} onClose={close} centered size={622.8} radius={25.2} padding={39.6}>
      <Modal.Overlay backgroundOpacity={0.35} blur={6} color="#24104f" />
      <Modal.Content className={styles.content}>
        <Modal.Body>
          <div className={styles.icon} aria-hidden="true">
            <Trash2 size={24} strokeWidth={2.16} />
          </div>

          <Modal.Title className={styles.title}>Delete your account?</Modal.Title>
          <p className={styles.lead}>This can’t be undone. We will permanently delete:</p>
          <ul className={styles.list}>
            <li>Your posts and comments</li>
            <li>Comments others left on your posts</li>
            <li>The company data you shared</li>
          </ul>

          <Checkbox
            checked={understood}
            onChange={(event) => setUnderstood(event.currentTarget.checked)}
            label="I understand this can’t be undone"
            color="#cd3025"
            size="md"
            radius={6}
            classNames={{ label: styles.checkLabel, root: styles.check }}
            disabled={deleteAccount.isPending}
          />

          {deleteAccount.error ? (
            <p className={styles.error} role="alert">
              {getErrorMessage(deleteAccount.error)}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancel}
              onClick={close}
              disabled={deleteAccount.isPending}
            >
              Cancel
            </button>
            <button
              type="button"
              className={styles.delete}
              onClick={() => deleteAccount.mutate()}
              disabled={!understood || deleteAccount.isPending}
            >
              {deleteAccount.isPending ? 'Deleting…' : 'Delete account'}
            </button>
          </div>
        </Modal.Body>
      </Modal.Content>
    </Modal.Root>
  );
}
