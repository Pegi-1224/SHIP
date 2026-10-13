/**
 * Deterministic anonymous identities.
 *
 * Every user gets a stable label and colour derived from their id, so the same
 * author looks the same on every post, comment and message without the client
 * ever seeing a name or an email address.
 */
import type { AnonymousIdentity } from '@/shared/types/common';

const ANIMALS = [
  'Finch',
  'Heron',
  'Otter',
  'Lynx',
  'Marten',
  'Osprey',
  'Wren',
  'Ibis',
  'Sable',
  'Puffin',
  'Kestrel',
  'Tanager',
  'Vireo',
  'Avocet',
  'Plover',
  'Shrike',
];

const COLORS = [
  '#7c40b6',
  '#1c7f8f',
  '#b3532a',
  '#2f6b3f',
  '#8a3d6b',
  '#3a5ca8',
  '#8a5a00',
  '#5a4bb0',
];

/** Stable 32-bit hash so the same id always yields the same identity. */
function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result);
}

export function createAnonymousIdentity(userId: string): AnonymousIdentity {
  const seed = hash(userId);
  const animal = ANIMALS[seed % ANIMALS.length] ?? 'Finch';
  const color = COLORS[(seed >> 5) % COLORS.length] ?? '#7c40b6';

  return {
    // Derived from the user id but not reversible to it by the client.
    id: `anon_${(seed % 100000).toString(36)}${userId.slice(-3)}`,
    label: `Anonymous ${animal}`,
    color,
  };
}
