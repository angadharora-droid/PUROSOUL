import { api } from '@/lib/api';

export async function fetchValidationEmails() {
  const res = await api.get('/settings/emails');
  return res.data.data.emails as string[];
}

export async function updateValidationEmails(emails: string[]) {
  const res = await api.put('/settings/emails', { emails });
  return res.data.data.emails as string[];
}
