import type { VerificationStatus } from '@/shared/types/demoSearch';
import { formatDate } from '@/shared/utils/format';

/** `2026-09-28` is a calendar date; pin it to midday so no time zone shifts the day. */
export function formatDay(value: string | null): string {
  return formatDate(value ? `${value}T12:00:00` : null);
}

export const VERIFICATION_BADGE: Record<VerificationStatus, { label: string; color: string }> = {
  verified: { label: 'AI verified', color: 'green' },
  needs_review: { label: 'Needs review', color: 'yellow' },
  unverified: { label: 'Not verified', color: 'gray' },
};
