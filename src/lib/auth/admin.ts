/**
 * Returns true only when `email` is non-empty AND appears in the
 * ADMIN_EMAILS environment variable (comma-separated, case-insensitive).
 *
 * When ADMIN_EMAILS is unset or empty the allow-list is empty and this
 * function always returns false — preventing the ''.split(',') → ['']
 * privilege-escalation bug that would otherwise grant access to users
 * whose email is null/undefined.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allow = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allow.length > 0 && allow.includes(email.toLowerCase());
}
