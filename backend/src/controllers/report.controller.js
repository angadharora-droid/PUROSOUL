import asyncHandler from '../utils/asyncHandler.js';
import ReportImport from '../models/ReportImport.js';
import { triggerDispatchEmailImport } from '../services/dispatchEmailFetch.service.js';

/**
 * Manually re-fetches the latest sales-report email and re-imports its workbook,
 * then returns the refreshed latest ReportImport for the dashboard card. Backs
 * the dashboard "Refresh" button. Re-importing is idempotent (vouchers already
 * recorded are skipped), so clicking repeatedly is always safe.
 */
export const refreshReport = asyncHandler(async (_req, res) => {
  const { processed, summaries } = await triggerDispatchEmailImport({ force: true });

  const created = summaries.reduce((n, s) => n + s.created.length, 0);
  const casesAdded = summaries.reduce(
    (n, s) => n + s.created.reduce((c, row) => c + (row.cases || 0), 0),
    0
  );
  const latestReportImport = await ReportImport.findOne().sort('-createdAt').lean();

  const message = !processed
    ? 'No sales-report email found in the mailbox.'
    : created > 0
      ? `Imported ${created} new dispatch${created === 1 ? '' : 'es'} (${casesAdded} cases) from the latest report.`
      : 'Latest report re-read — every invoice was already recorded.';

  res.json({ success: true, data: { processed, created, casesAdded, latestReportImport }, message });
});
