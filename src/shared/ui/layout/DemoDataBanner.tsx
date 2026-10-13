import { Alert, Text } from '@mantine/core';
import { FlaskConical } from 'lucide-react';
import { env } from '@/shared/config/env';
import styles from './DemoDataBanner.module.css';

/**
 * Permanent, unmissable notice that nothing on screen is real.
 *
 * Every company, metric, post and message comes from `src/mocks`. Sign-in sends
 * no email and talks to no identity provider. Removing this banner while the
 * app still runs on mocks would misrepresent demonstration data as real
 * workplace information about real employers.
 *
 * It renders only in mock mode, so switching `VITE_ENABLE_MOCKS=false` against
 * a real backend hides it automatically.
 */
export function DemoDataBanner() {
  if (!env.enableMocks) return null;

  return (
    <Alert
      color="ship"
      variant="light"
      radius={0}
      className={styles.banner}
      icon={<FlaskConical size={18} aria-hidden="true" />}
      role="note"
    >
      <Text size="sm" className={styles.text}>
        <strong>Demonstration mode.</strong> Every company, number, post and message here is
        fictional sample data served by an in-browser mock API. Sign-in is simulated: no email is
        sent and no identity provider is contacted.
      </Text>
    </Alert>
  );
}
