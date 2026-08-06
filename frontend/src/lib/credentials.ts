import type { Role } from '@/types';

/** Mirrors backend/src/utils/credentials.js — keep the two in sync. */

export function isValidPasswordForRole(password: string, role: Role) {
  return password.length >= 8 || (role === 'admin' && /^(\d{4}|\d{6})$/.test(password));
}

export function passwordRuleMessage(role: Role) {
  return role === 'admin'
    ? 'Minimum 8 characters, or a 4 or 6 digit PIN'
    : 'Minimum 8 characters';
}

/** Loose phone check: 10–15 digits once formatting (spaces, dashes, brackets, +) is removed. */
export function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}
