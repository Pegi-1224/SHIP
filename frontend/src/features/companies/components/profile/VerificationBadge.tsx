import { Badge } from '@mantine/core';
import type { VerificationStatus } from '@/shared/types/demoSearch';
import { VERIFICATION_BADGE } from './format';

/** Result of the automated check that the company's information is correct. */
export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const badge = VERIFICATION_BADGE[status];
  return (
    <Badge size="sm" variant="light" color={badge.color}>
      {badge.label}
    </Badge>
  );
}
