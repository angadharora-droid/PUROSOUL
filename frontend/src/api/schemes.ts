import { api } from '@/lib/api';
import type { Scheme } from '@/types';

export type SchemeInput = Omit<Scheme, '_id' | 'createdAt' | 'updatedAt'>;

export async function fetchSchemes(activeOnly = false) {
  const res = await api.get('/schemes', { params: activeOnly ? { active: 'true' } : {} });
  return res.data.data as Scheme[];
}

export async function createScheme(payload: SchemeInput) {
  const res = await api.post('/schemes', payload);
  return res.data.data as Scheme;
}

export async function updateScheme(id: string, payload: SchemeInput) {
  const res = await api.put(`/schemes/${id}`, payload);
  return res.data.data as Scheme;
}

export async function deleteScheme(id: string) {
  const res = await api.delete(`/schemes/${id}`);
  return res.data;
}
