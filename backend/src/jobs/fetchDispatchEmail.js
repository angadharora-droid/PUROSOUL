/**
 * Daily dispatch-history import from the vendor's sales report email.
 *
 * The employee mails the AFVPL daily sales workbook every day except Sunday,
 * at no fixed time (usually 9 AM – 2 PM). This job logs into the report
 * mailbox over IMAP, finds every matching email that has not been processed
 * yet, extracts the Excel attachments and imports every new invoice into the
 * dispatch history (see dispatchImport.service.js).
 *
 * Missed days heal themselves: the workbook is cumulative (each mail re-sends
 * the whole month), every processed email is recorded in the ReportImport
 * collection (which also powers the dashboard card) and the job catches up on
 * everything newer than the last record — so an employee holiday, a forgotten
 * mail or the machine being off only delays the import, never loses it. The
 * first run looks back REPORT_LOOKBACK_DAYS (default 45) to backfill history.
 * Vouchers already recorded are skipped, so re-processing is always safe.
 *
 * Schedule via Windows Task Scheduler to check hourly 9 AM–4 PM, Mon–Sat
 * (see README — runs that find no new mail exit in seconds):
 *   npm run import:dispatch-email
 * Or import a workbook already on disk (no IMAP):
 *   npm run import:dispatch-email -- --file "C:\path\to\report.xlsx"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { connectDB } from '../config/db.js';
import env from '../config/env.js';
import ReportImport from '../models/ReportImport.js';
import { importDispatchWorkbook } from '../services/dispatchImport.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ATTACHMENT_DIR = path.resolve(__dirname, '../../data/attachments');

const SPREADSHEET_EXT = /\.(xlsx|xls|csv)$/i;
const DAY_MS = 86400000;

/** Same identification rules as the Purosoul handler in fetchEmailReport.js. */
function matchesSalesReport({ subject, from, attachmentNames }) {
  const looksLikeReport =
    /daily sales|sales report/i.test(subject) || /AFVPL|purosoul/i.test(attachmentNames);
  const fromKnownSender = /amarjit fiscal|afvpl|purosoul/i.test(
    `${subject} ${from} ${attachmentNames}`
  );
  return looksLikeReport && fromKnownSender;
}

function describeParsed(parsed) {
  return {
    subject: parsed.subject || '',
    from: parsed.from?.text || '',
    attachmentNames: (parsed.attachments || []).map((a) => a.filename || '').join(' '),
  };
}

function pickAttachment(parsed) {
  return (parsed.attachments || []).find((a) => SPREADSHEET_EXT.test(a.filename || ''));
}

/** Attachment filenames from an IMAP body structure, without downloading the message. */
function collectAttachmentNames(node, names = []) {
  if (!node) return names;
  const name = node.dispositionParameters?.filename || node.parameters?.name;
  if (name) names.push(name);
  for (const child of node.childNodes || []) collectAttachmentNames(child, names);
  return names;
}

/**
 * Every matching report email newer than the last processed one, oldest first.
 * Headers and attachment names are checked before downloading, so only real
 * report emails are pulled in full.
 */
async function fetchUnprocessedReportEmails() {
  const { host, port, user, pass, lookbackDays } = env.reportMail;
  if (!pass) throw new Error('REPORT_EMAIL_PASSWORD is not set');

  // Resume from the newest processed email recorded in the database.
  const lastImport = await ReportImport.findOne({ source: 'EMAIL' }).sort('-emailDate').lean();
  const lastEmailDate = lastImport?.emailDate ? new Date(lastImport.emailDate).getTime() : null;
  // Overlap the last processed day to survive clock differences; the voucher
  // dedup makes re-processing harmless.
  const sinceMs = lastEmailDate ? lastEmailDate - DAY_MS : Date.now() - lookbackDays * DAY_MS;

  const client = new ImapFlow({ host, port, secure: true, auth: { user, pass }, logger: false });
  await client.connect();

  try {
    await client.mailboxOpen('INBOX');
    const seqs = await client.search({ since: new Date(sinceMs) });
    if (!seqs?.length) return [];

    const candidates = [];
    for await (const msg of client.fetch(seqs, { envelope: true, bodyStructure: true })) {
      const subject = msg.envelope?.subject || '';
      const from = (msg.envelope?.from || [])
        .map((a) => `${a.name || ''} ${a.address || ''}`)
        .join(' ');
      const attachmentNames = collectAttachmentNames(msg.bodyStructure).join(' ');
      if (matchesSalesReport({ subject, from, attachmentNames })) candidates.push(msg.seq);
    }
    if (!candidates.length) return [];

    const reports = [];
    for await (const msg of client.fetch(candidates, { source: true })) {
      const parsed = await simpleParser(msg.source);
      if (!matchesSalesReport(describeParsed(parsed)) || !pickAttachment(parsed)) continue;
      if (lastEmailDate && (parsed.date?.getTime() || 0) <= lastEmailDate) continue;
      reports.push(parsed);
    }
    return reports.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  } finally {
    await client.logout().catch(() => {});
  }
}

function saveAttachmentCopy(attachment, emailDate) {
  fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
  const stamp = (emailDate || new Date()).toISOString().slice(0, 10);
  const safeName = (attachment.filename || 'report.xlsx').replace(/[^\w.-]+/g, '_');
  const dest = path.join(ATTACHMENT_DIR, `${stamp}__${safeName}`);
  fs.writeFileSync(dest, attachment.content);
  return dest;
}

function printSummary(summary) {
  console.log(`\nImport summary for ${summary.file}`);
  console.log(`  Invoices in workbook : ${summary.totalInvoices}`);
  console.log(`  Dispatches created   : ${summary.created.length}`);
  console.log(`  Already recorded     : ${summary.duplicates}`);
  console.log(`  Parties without a scheme: ${summary.unmatchedParties.length}`);
  for (const c of summary.created) {
    console.log(`  + ${c.date}  ${c.party} — ${c.cases} cases (bill ${c.voucherNo}, scheme "${c.scheme}")`);
  }
  for (const s of summary.skipped) {
    console.log(`  ! Skipped ${s.voucherNo} (${s.party}): ${s.reason}`);
  }
}

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

  console.log(`Checking ${env.reportMail.user} for unprocessed sales reports...`);
  const reports = await fetchUnprocessedReportEmails();
  if (!reports.length) {
    console.log('No new sales-report email found — dispatch history is up to date.');
    return;
  }

  console.log(`${reports.length} unprocessed report email(s) found. Importing oldest first...`);
  for (const parsed of reports) {
    const attachment = pickAttachment(parsed);
    const savedTo = saveAttachmentCopy(attachment, parsed.date);
    console.log(`\n— "${parsed.subject}" (${parsed.date?.toLocaleString('en-IN') || 'no date'})`);
    console.log(`  Attachment saved to ${savedTo}`);

    // The import records each run in ReportImport, so a crash mid-catch-up
    // resumes from the right email instead of starting over.
    const summary = await importDispatchWorkbook(attachment.content, {
      filename: attachment.filename || 'sales-report.xlsx',
      emailDate: parsed.date || new Date(),
      emailSubject: parsed.subject || '',
    });
    printSummary(summary);
  }
}

main()
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error('Dispatch email import failed:', err.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
