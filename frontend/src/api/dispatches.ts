import { api } from '@/lib/api';
import type { Dispatch, Registration } from '@/types';

export interface DispatchInput {
  registration: string;
  dispatchDate: string;
  billNumber: string;
  vehicleNumber?: string;
  cases250ml: number;
  cases500ml: number;
  cases1l: number;
  remarks?: string;
}

export async function createDispatch(payload: DispatchInput) {
  const res = await api.post('/dispatches', payload);
  return res.data.data as { dispatch: Dispatch; registration: Registration };
}

export async function fetchDispatches(registrationId: string) {
  const res = await api.get(`/dispatches/${registrationId}`);
  return res.data.data as Dispatch[];
}
