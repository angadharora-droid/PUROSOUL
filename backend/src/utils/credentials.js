/**
 * Shared rules for login identifiers and passwords.
 *
 * Phone numbers are compared on their last 10 digits so that formatting
 * (spaces, dashes, brackets) and an optional country code never matter:
 * "+91 98765 43210" and "9876543210" are the same number.
 */
export function normalizePhone(value = '') {
  return String(value).replace(/\D/g, '').slice(-10);
}

export function phonesMatch(a, b) {
  const na = normalizePhone(a);
  return na.length > 0 && na === normalizePhone(b);
}

export function isPin(value) {
  return /^\d{4}$/.test(value) || /^\d{6}$/.test(value);
}

/** Admins may use a 4/6-digit PIN or a normal password; everyone else needs 8+ chars. */
export function isValidPasswordForRole(password, role) {
  if (typeof password !== 'string') return false;
  if (password.length >= 8) return true;
  return role === 'admin' && isPin(password);
}

export function passwordRuleMessage(role) {
  return role === 'admin'
    ? 'Password must be at least 8 characters, or a 4 or 6 digit PIN'
    : 'Password must be at least 8 characters';
}
