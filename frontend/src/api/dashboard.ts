import { api } from '@/lib/api';
import type { DashboardData } from '@/types';

export async function fetchDashboard() {
  const res = await api.get('/dashboard');
  return res.data.data as DashboardData;
}
