/**
 * Seed accounts for the demo.
 *
 * All names and addresses are invented and the `example.com` domain is
 * reserved by RFC 2606, so none of these can reach a real inbox.
 */
import type { MockUser } from '../types';

const BASE_DATE = '2026-05-01T09:00:00.000Z';

const SEED_NAMES = [
  'Rowan',
  'Mira',
  'Imani',
  'Noor',
  'Sloane',
  'Priya',
  'Camille',
  'Dahlia',
  'Esme',
  'Frida',
  'Greer',
  'Hana',
  'Iris',
  'June',
];

/**
 * Fourteen contributors, which is enough to put some company metrics above the
 * five-contributor privacy threshold and keep others below it.
 */
export const SEED_USERS: MockUser[] = SEED_NAMES.map((name, index) => ({
  id: `user_seed_${index + 1}`,
  email: `${name.toLowerCase()}@example.com`,
  displayName: name,
  authProvider: 'email_code_mock',
  createdAt: new Date(new Date(BASE_DATE).getTime() + index * 86_400_000).toISOString(),
  hasCompletedAssessment: true,
  hasSeenInstructions: true,
}));

export function seedUserId(index: number): string {
  const user = SEED_USERS[index];
  if (!user) throw new Error(`No seed user at index ${index}`);
  return user.id;
}
