/** Fallback avatars for users without a picture. */

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) >>> 0;
  return value;
}

/** A two-colour gradient that looks random but is fixed for each `seed`. */
export function avatarGradient(seed: string): string {
  const value = hash(seed);
  const hueA = value % 360;
  const hueB = (hueA + 40 + ((value >>> 9) % 80)) % 360;
  const angle = 90 + ((value >>> 17) % 90);
  return `linear-gradient(${angle}deg, hsl(${hueA} 70% 62%) 0%, hsl(${hueB} 72% 52%) 100%)`;
}
