import { api } from '@/lib/api';
import type { AuditLog, Paginated, PrintPayload, Registration, RegistrationFilters } from '@/types';

export async function fetchRegistrations(filters: RegistrationFilters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );
  const res = await api.get('/registrations', { params });
  return res.data.data as Paginated<Registration>;
}

export async function fetchRegistration(id: string) {
  const res = await api.get(`/registrations/${id}`);
  return res.data.data as Registration;
}

export async function createRegistration(formData: FormData) {
  const res = await api.post('/registrations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data as Registration;
}

export async function updateScreenshot(id: string, file: File) {
  const formData = new FormData();
  formData.append('screenshot', file);
  const res = await api.patch(`/registrations/${id}/screenshot`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data as Registration;
}

export async function fetchTimeline(id: string) {
  const res = await api.get(`/registrations/${id}/timeline`);
  return res.data.data as AuditLog[];
}

export async function fetchPrintPayload(id: string) {
  const res = await api.get(`/print/${id}`);
  return res.data.data as PrintPayload;
}
