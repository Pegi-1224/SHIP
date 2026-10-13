import { useState } from 'react';
import { Button, List, Paper, Stack, Text, TextInput, Title } from '@mantine/core';
import { AlertTriangle } from 'lucide-react';
import { getErrorMessage } from '@/shared/api';
import { ConfirmDialog } from '@/shared/ui';
import { useDeleteAccount } from '@/features/auth';
import styles from './DeleteAccountSection.module.css';

const CONFIRM_WORD = 'DELETE';

/**
 * Account deletion (spec 3.9, AC-9).
 *
 * The frontend sends one request. Removing the user's posts, every comment on
 * those posts, their own comments elsewhere, their company submissions and both
 * copies of every direct message - and recomputing the affected company
 * aggregates afterwards - all happen on the server in a single operation.
 *
 * The client could not do it correctly even if it tried: it cannot see other
 * people's comments on its posts, and a partial failure would leave orphaned
 * records behind.
 */
export function DeleteAccountSection() {
  const deleteAccount = useDeleteAccount();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState('');

  return (
    <Paper withBorder p="lg" className={styles.danger} component="section">
      <Stack gap="sm">
        <Title order={2} size="var(--ship-text-lg)" className={styles.heading}>
          <AlertTriangle size={18} aria-hidden="true" />
          Delete your account
        </Title>

        <Text size="sm">Deleting your account permanently removes:</Text>
        <List size="sm" spacing={2}>
          <List.Item>your posts, and every comment other people left on them;</List.Item>
          <List.Item>your comments on other people&apos;s posts;</List.Item>
          <List.Item>the company data you submitted, which changes those averages;</List.Item>
          <List.Item>your direct messages, for both you and the other person.</List.Item>
        </List>
        <Text size="sm" fw={600}>
          This cannot be undone.
        </Text>

        <div>
          <Button color="red" variant="light" onClick={() => setConfirmOpen(true)}>
            Delete my account
          </Button>
        </div>
      </Stack>

      <ConfirmDialog
        opened={confirmOpen}
        title="Delete your account permanently?"
        description={
          <Stack gap="sm">
            <Text size="sm">
              Everything listed on the previous screen will be removed. Company averages you
              contributed to will be recalculated, and a metric may drop back below the
              five-contributor threshold and stop being shown.
            </Text>
            <TextInput
              label={`Type ${CONFIRM_WORD} to confirm`}
              value={typed}
              onChange={(event) => setTyped(event.currentTarget.value)}
              placeholder={CONFIRM_WORD}
              autoComplete="off"
            />
          </Stack>
        }
        confirmLabel={deleteAccount.isPending ? 'Deleting…' : 'Delete everything'}
        tone="danger"
        isPending={deleteAccount.isPending}
        confirmDisabled={typed !== CONFIRM_WORD}
        confirmDisabledReason={`Type ${CONFIRM_WORD} above to enable this button.`}
        errorMessage={deleteAccount.error ? getErrorMessage(deleteAccount.error) : null}
        onConfirm={() => {
          if (typed !== CONFIRM_WORD) return;
          deleteAccount.mutate();
        }}
        onCancel={() => {
          setConfirmOpen(false);
          setTyped('');
          deleteAccount.reset();
        }}
      />
    </Paper>
  );
}
