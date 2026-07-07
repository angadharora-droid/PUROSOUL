import { api } from '@/lib/api';
import type { Role, User } from '@/types';

export async function fetchUsers() {
  const res = await api.get('/users');
  return res.data.data as User[];
}

export async function createUser(payload: { name: string; email: string; password: string; role: Role }) {
  const res = await api.post('/users', payload);
  return res.data.data as User;
}

export async function updateUser(id: string, payload: { isActive?: boolean; role?: Role }) {
  const res = await api.patch(`/users/${id}`, payload);
  return res.data.data as User;
}
