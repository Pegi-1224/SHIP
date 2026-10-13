import { Alert, List, Text } from '@mantine/core';
import { Info } from 'lucide-react';
import { env } from '@/shared/config/env';

/**
 * Says plainly that sign-in is simulated.
 *
 * This is not decoration. Without it, a working-looking Google button and a
 * working-looking verification code would read as a real authentication
 * integration, which would be a false claim about what this build does.
 */
export function MockAuthNotice() {
  if (!env.enableMocks) return null;

  return (
    <Alert
      color="ship"
      variant="light"
      icon={<Info size={18} aria-hidden="true" />}
      title="Sign-in is simulated in this build"
      role="note"
    >
      <Text size="sm" mb={6}>
        There is no backend, no identity provider and no mail service behind this screen.
      </Text>
      <List size="sm" spacing={4}>
        <List.Item>
          <strong>Continue with Google</strong> runs no OAuth flow. It signs you into a fixed demo
          account.
        </List.Item>
        <List.Item>
          <strong>Email sign-in</strong> sends no email. The mock API shows you the code it
          generated so you can paste it in.
        </List.Item>
      </List>
    </Alert>
  );
}
