import mongoose from 'mongoose';

/**
 * One record per processed sales-report import (email or manual file).
 * Powers the dashboard's "Today's Sales Report" card and serves as the
 * resume point for the email job: the newest emailDate here marks the last
 * processed email, so no local state file is needed (works across separate
 * web/cron containers that only share the database).
 */
const reportImportSchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['EMAIL', 'FILE'], required: true },
    emailDate: { type: Date, index: true }, // Date header of the report email (EMAIL only)
    emailSubject: { type: String, trim: true, maxlength: 300 },
    filename: { type: String, trim: true, maxlength: 200 },
    invoicesInFile: { type: Number, default: 0 },
    dispatchesCreated: { type: Number, default: 0 },
    casesAdded: { type: Number, default: 0 },
    duplicates: { type: Number, default: 0 },
    unmatchedParties: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    // What was actually added, for the dashboard detail view (capped by the service).
    created: [
      {
        _id: false,
        party: String,
        cases: Number,
        voucherNo: String,
        date: String,
        scheme: String,
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('ReportImport', reportImportSchema);
