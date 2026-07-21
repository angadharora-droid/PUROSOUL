import { api } from '@/lib/api';
import type { ReportImport } from '@/types';

export interface RefreshReportResult {
  processed: number;
  created: number;
  casesAdded: number;
  latestReportImport: ReportImport | null;
}

/** Manually pulls the latest sales-report email and re-imports its Excel data. */
export async function refreshReportImport() {
  const res = await api.post('/reports/refresh');
  return {
    data: res.data.data as RefreshReportResult,
    message: res.data.message as string,
  };
}
