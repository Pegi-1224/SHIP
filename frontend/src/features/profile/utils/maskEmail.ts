/**
 * An email address with the middle of its name hidden: `sarah@gmail.com` becomes `s••••@gmail.com`.
 * Profile shows the account's email this way, so it is not readable over the user's shoulder.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at <= 0) return '••••';
  return `${email.slice(0, 1)}••••${email.slice(at)}`;
}
