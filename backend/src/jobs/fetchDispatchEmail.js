/**
 * Manual/standalone entry point for the sales-report import.
 *
 * The web server already checks the mailbox automatically while it runs
 * (see dispatchEmailFetch.service.js) — use this script for one-off runs:
 *
 *   npm run import:dispatch-email                        # check mailbox now
 *   npm run import:dispatch-email -- --file report.xlsx  # import a file on disk
 *
 * Re-runs are always safe: vouchers already recorded are skipped.
 */
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { importDispatchWorkbook } from '../services/dispatchImport.service.js';
import { printSummary, runDispatchEmailImport } from '../services/dispatchEmailFetch.service.js';

async function main() {
  const fileArgIdx = process.argv.indexOf('--file');
  await connectDB();

  if (fileArgIdx !== -1) {
    const filePath = process.argv[fileArgIdx + 1];
    if (!filePath) throw new Error('Usage: --file <path-to-workbook>');
    console.log(`Importing local file: ${filePath}`);
    const summary = await importDispatchWorkbook(fs.readFileSync(filePath), {
      filename: path.basename(filePath),
    });
    printSummary(summary);
    return;
  }

  await runDispatchEmailImport();
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Dispatch email import failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
