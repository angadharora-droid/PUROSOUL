import { api } from '@/lib/api';
import type { Dispatch } from '@/types';

export async function fetchDispatches(registrationId: string) {
  const res = await api.get(`/dispatches/${registrationId}`);
  return res.data.data as Dispatch[];
}
