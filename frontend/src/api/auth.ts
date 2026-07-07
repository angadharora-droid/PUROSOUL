import { api } from '@/lib/api';
import type { User } from '@/types';

export async function login(email: string, password: string) {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data as { token: string; user: User };
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data.data as User;
}

export async function changePassword(payload: { currentPassword: string; newPassword: string }) {
  const res = await api.patch('/auth/password', payload);
  return res.data;
}
