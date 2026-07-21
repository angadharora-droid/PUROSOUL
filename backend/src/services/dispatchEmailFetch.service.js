/**
 * Fetches the vendor's daily sales-report emails over IMAP and imports them
 * into the dispatch history (see dispatchImport.service.js). Used two ways:
 *
 *  - startDispatchEmailScheduler(): in-process scheduler started by the web
 *    server. Checks the mailbox once on boot (catch-up after downtime) and
 *    then every 30 minutes during business hours (9 AM – 5 PM IST, Mon–Sat,
 *    the report usually arrives 9 AM – 2 PM). On Railway this means no cron
 *    service is needed — the web service does everything.
 *
 *  - runDispatchEmailImport(): one full check-and-import pass, also used by
 *    the standalone job (npm run import:dispatch-email) for manual runs.
 *
 * Every processed email is recorded in the ReportImport collection, which is
 * both the dashboard's data source and the resume point — so overlapping runs
 * (server scheduler + a manual run) can never double-import.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import env from '../config/env.js';
import ReportImport from '../models/ReportImport.js';
import { importDispatchWorkbook } from './dispatchImport.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ATTACHMENT_DIR = path.resolve(__dirname, '../../data/attachments');

const SPREADSHEET_EXT = /\.(xlsx|xls|csv)$/i;
const DAY_MS = 86400000;
const IST_OFFSET_MS = 5.5 * 3600000;
const CHECK_INTERVAL_MS = 30 * 60000;

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

export function pickAttachment(parsed) {
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
function missingMailConfig() {
  const { host, user, pass } = env.reportMail;
  return [!host && 'REPORT_IMAP_HOST', !user && 'REPORT_EMAIL_USER', !pass && 'REPORT_EMAIL_PASSWORD']
    .filter(Boolean)
    .join(', ');
}

async function fetchUnprocessedReportEmails({ force = false } = {}) {
  const { host, port, user, pass, lookbackDays } = env.reportMail;
  const missing = missingMailConfig();
  if (missing) throw new Error(`Report mailbox is not configured — set ${missing}`);

  // Resume from the newest processed email recorded in the database. A forced
  // run (the manual "Refresh" button) ignores this resume point and re-reads the
  // latest matching email even if it was already imported — the voucher dedup
  // in importDispatchWorkbook makes re-processing harmless.
  const lastImport = await ReportImport.findOne({ source: 'EMAIL' }).sort('-emailDate').lean();
  const lastEmailDate =
    force || !lastImport?.emailDate ? null : new Date(lastImport.emailDate).getTime();
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
    const ordered = reports.sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
    // A forced run re-reads only the newest matching report, not the whole
    // lookback window, so a Refresh click never re-imports weeks of email.
    return force ? ordered.slice(-1) : ordered;
  } finally {
    await client.logout().catch(() => {});
  }
}

/** Best-effort archive copy; failures never block the import. */
function saveAttachmentCopy(attachment, emailDate) {
  try {
    fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
    const stamp = (emailDate || new Date()).toISOString().slice(0, 10);
    const safeName = (attachment.filename || 'report.xlsx').replace(/[^\w.-]+/g, '_');
    const dest = path.join(ATTACHMENT_DIR, `${stamp}__${safeName}`);
    fs.writeFileSync(dest, attachment.content);
    return dest;
  } catch (err) {
    console.error('Could not archive report attachment:', err.message);
    return null;
  }
}

export function printSummary(summary) {
  console.log(`Import summary for ${summary.file}`);
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

/**
 * One full pass: fetch report emails and import each one. Assumes the database
 * is already connected. Pass { force: true } to re-read the latest report even
 * if it was already imported (the manual "Refresh" button). Returns
 * { processed, summaries } — the number of emails imported and each import's summary.
 */
export async function runDispatchEmailImport({ force = false } = {}) {
  console.log(
    `[report-fetch] Checking ${env.reportMail.user} for ${force ? 'the latest' : 'unprocessed'} sales report(s)...`
  );
  const reports = await fetchUnprocessedReportEmails({ force });
  if (!reports.length) {
    console.log(
      force
        ? '[report-fetch] No sales-report email found in the mailbox to import.'
        : '[report-fetch] No new sales-report email — dispatch history is up to date.'
    );
    return { processed: 0, summaries: [] };
  }

  console.log(`[report-fetch] ${reports.length} report email(s) to import. Importing oldest first...`);
  const summaries = [];
  for (const parsed of reports) {
    const attachment = pickAttachment(parsed);
    const savedTo = saveAttachmentCopy(attachment, parsed.date);
    console.log(`[report-fetch] "${parsed.subject}" (${parsed.date?.toLocaleString('en-IN') || 'no date'})`);
    if (savedTo) console.log(`[report-fetch] Attachment archived to ${savedTo}`);

    // The import records each run in ReportImport, so a crash mid-catch-up
    // resumes from the right email instead of starting over.
    const summary = await importDispatchWorkbook(attachment.content, {
      filename: attachment.filename || 'sales-report.xlsx',
      emailDate: parsed.date || new Date(),
      emailSubject: parsed.subject || '',
    });
    printSummary(summary);
    summaries.push(summary);
  }
  return { processed: reports.length, summaries };
}

/**
 * Serializes import passes so the manual "Refresh" and the background scheduler
 * never open two IMAP sessions (or write two ReportImport records) at once —
 * each queued call runs after the previous one settles and gets its own result.
 */
let importChain = Promise.resolve();
export function triggerDispatchEmailImport(options = {}) {
  const run = importChain.catch(() => {}).then(() => runDispatchEmailImport(options));
  importChain = run.catch(() => {});
  return run;
}

/** The report arrives Mon–Sat sometime between 9 AM and ~2 PM IST. */
export function isWithinFetchWindow(now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const day = ist.getUTCDay();
  const hour = ist.getUTCHours();
  return day !== 0 && hour >= 9 && hour < 17;
}

/**
 * In-process scheduler, started by the web server. One catch-up check shortly
 * after boot (any time, any day — it heals gaps after downtime), then a check
 * every 30 minutes inside the business-hours window. A guard prevents
 * overlapping passes.
 */
export function startDispatchEmailScheduler() {
  if (!env.reportMail.autoFetch) {
    console.log('[report-fetch] Auto-fetch disabled (REPORT_AUTO_FETCH=false).');
    return;
  }
  const missing = missingMailConfig();
  if (missing) {
    console.warn(`[report-fetch] ${missing} not set — sales-report auto-import is OFF.`);
    return;
  }

  let running = false;
  const tick = async (force = false) => {
    if (running || (!force && !isWithinFetchWindow())) return;
    running = true;
    try {
      await triggerDispatchEmailImport();
    } catch (err) {
      console.error('[report-fetch] Check failed (will retry on next tick):', err.message);
    } finally {
      running = false;
    }
  };

  setTimeout(() => tick(true), 15_000); // boot catch-up
  setInterval(tick, CHECK_INTERVAL_MS);
  console.log('[report-fetch] Scheduler started: mailbox checked every 30 min, 9 AM–5 PM IST, Mon–Sat.');
}
