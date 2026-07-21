import XLSX from 'xlsx';
import crypto from 'crypto';
import Dispatch from '../models/Dispatch.js';
import SchemeRegistration from '../models/SchemeRegistration.js';
import ReportImport from '../models/ReportImport.js';
import User from '../models/User.js';
import { addDispatch } from './dispatch.service.js';
import { expireOverdue } from './registration.service.js';
import { startOfDay, endOfDay } from '../utils/helpers.js';

/**
 * Imports the vendor's daily sales workbook (Tally "Ledger Account" export,
 * one tab per month) into the dispatch history.
 *
 * Each invoice row carries the party name ("Particulars"), a unique
 * "Voucher No." (used as the sales bill number, which makes re-imports of the
 * same monthly file idempotent) and the total "Quantity" of cases — the report
 * has no 250ml/500ml/1L split, so imported dispatches only set totalCases.
 */

const norm = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();
const normKey = (v) => norm(v).toUpperCase();

/** Rows that are not invoices: blank days, section labels and the summary row. */
const NON_PARTY_ROWS = new Set(['', 'NIL', 'GRAND TOTAL', 'TOTAL']);

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/**
 * Case count from a quantity cell. Some monthly tabs export the unit alongside
 * the number ("200 BOXES") instead of a bare numeric cell, so the leading
 * number is read out of the text rather than relying on Number().
 */
function parseQuantityCell(value) {
  if (typeof value === 'number') return Math.round(value);
  const m = norm(value).match(/\d[\d,]*(\.\d+)?/);
  return m ? Math.round(Number(m[0].replace(/,/g, ''))) : NaN;
}

/**
 * Parses a date cell into a local Date pinned to noon (safely inside the day,
 * regardless of timezone). Numeric cells are Excel serials — parsed with
 * XLSX.SSF so no timezone conversion is involved.
 */
function parseDateCell(value) {
  if (value == null || value === '') return null;

  if (typeof value === 'number') {
    const d = XLSX.SSF.parse_date_code(value);
    return d ? new Date(d.y, d.m - 1, d.d, 12) : null;
  }

  if (value instanceof Date) {
    // Excel serials converted by cellDates can land seconds before IST midnight;
    // nudging forward before reading the calendar day corrects that.
    const adjusted = new Date(value.getTime() + 60 * 1000);
    return new Date(adjusted.getFullYear(), adjusted.getMonth(), adjusted.getDate(), 12);
  }

  const text = norm(value);
  let m;
  // ISO: 2026-07-03
  if ((m = text.match(/^(\d{4})-(\d{2})-(\d{2})/))) {
    return new Date(+m[1], +m[2] - 1, +m[3], 12);
  }
  // dd/mm/yyyy or dd-mm-yyyy (Tally is day-first)
  if ((m = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/))) {
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(year, +m[2] - 1, +m[1], 12);
  }
  // dd-MMM-yy / dd MMM yyyy: 3-Jul-26
  if ((m = text.match(/^(\d{1,2})[\s/-]([a-z]{3,9})[\s/-](\d{2,4})$/i))) {
    const month = MONTHS[m[2].slice(0, 3).toLowerCase()];
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    if (month) return new Date(year, month - 1, +m[1], 12);
  }
  return null;
}

/**
 * Extracts invoice rows from every sheet of the workbook.
 * Returns [{ date, party, voucherNo, quantity, sheet }], deduplicated by voucher.
 */
export function parseSalesWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const rows = [];
  const seenVouchers = new Set();

  for (const sheetName of wb.SheetNames) {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: null });

    // Header row is the one whose first cell is "Date"; column positions vary
    // between monthly tabs, so every column is located by header text.
    const headerIdx = grid.findIndex((r) => normKey(r?.[0]) === 'DATE');
    if (headerIdx === -1) continue;
    const header = grid[headerIdx].map(normKey);
    const col = {
      date: 0,
      party: header.indexOf('PARTICULARS'),
      voucher: header.indexOf('VOUCHER NO.'),
      quantity: header.indexOf('QUANTITY'),
    };
    if (col.party === -1 || col.voucher === -1 || col.quantity === -1) continue;

    for (const row of grid.slice(headerIdx + 1)) {
      if (!row) continue;
      const party = norm(row[col.party]);
      if (NON_PARTY_ROWS.has(party.toUpperCase())) continue;

      const voucherNo = normKey(row[col.voucher]);
      if (!voucherNo || /^-+$/.test(voucherNo)) continue;

      const quantity = parseQuantityCell(row[col.quantity]);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      const date = parseDateCell(row[col.date]);
      if (!date) continue;

      // Vouchers repeat when monthly tabs overlap; first occurrence wins.
      if (seenVouchers.has(voucherNo)) continue;
      seenVouchers.add(voucherNo);

      rows.push({ date, party, voucherNo, quantity, sheet: sheetName.trim() });
    }
  }

  return rows;
}

/** System user that automated imports are attributed to (cannot log in). */
async function ensureImportUser() {
  const email = 'dispatch-import@system.local';
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({
    name: 'Email Import (auto)',
    email,
    password: crypto.randomBytes(24).toString('hex'),
    role: 'sales',
    isActive: false,
  });
}

/**
 * Matches parsed invoice rows against scheme registrations and records a
 * dispatch for every new voucher whose party has a registration valid on the
 * invoice date. Rows for parties without a scheme are counted, not errors —
 * the vendor report covers all customers, not just scheme members.
 */
export async function importDispatchWorkbook(
  buffer,
  { filename = 'sales-report.xlsx', emailDate = null, emailSubject = '' } = {}
) {
  const rows = parseSalesWorkbook(buffer);
  const summary = {
    file: filename,
    totalInvoices: rows.length,
    created: [],
    duplicates: 0,
    unmatchedParties: new Set(),
    skipped: [],
  };
  if (!rows.length) return finishSummary(summary, { filename, emailDate, emailSubject });

  await expireOverdue();
  const user = await ensureImportUser();

  // Dispatches may be added to ACTIVE and COMPLETED registrations (within validity).
  const registrations = await SchemeRegistration.find({ status: { $in: ['ACTIVE', 'COMPLETED'] } });
  const byParty = new Map();
  for (const reg of registrations) {
    const key = normKey(reg.partyName);
    if (!byParty.has(key)) byParty.set(key, []);
    byParty.get(key).push(reg);
  }

  // The monthly file re-sends every prior day; vouchers already recorded are skipped.
  const existingBills = new Set(
    await Dispatch.find({ billNumber: { $in: rows.map((r) => r.voucherNo) } }).distinct('billNumber')
  );

  for (const row of rows) {
    const candidates = byParty.get(normKey(row.party));
    if (!candidates) {
      summary.unmatchedParties.add(row.party);
      continue;
    }
    if (existingBills.has(row.voucherNo)) {
      summary.duplicates += 1;
      continue;
    }

    // A party can hold several registrations: prefer the ones whose validity
    // window contains the invoice date, then the one expiring soonest.
    const inWindow = candidates.filter(
      (reg) => row.date >= startOfDay(reg.activationDate) && row.date <= endOfDay(reg.expiryDate)
    );
    const target = (inWindow.length ? inWindow : candidates).sort(
      (a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)
    )[0];
    if (!inWindow.length) {
      summary.skipped.push({
        voucherNo: row.voucherNo,
        party: row.party,
        reason: `Invoice date ${row.date.toLocaleDateString('en-IN')} is outside the scheme validity of "${target.schemeSnapshot?.name}"`,
      });
      continue;
    }

    try {
      await addDispatch({
        body: {
          registration: target._id.toString(),
          dispatchDate: row.date.toISOString(),
          billNumber: row.voucherNo,
          totalCases: row.quantity,
          source: 'EMAIL_IMPORT',
          remarks: `Auto-imported from ${filename} (sheet ${row.sheet})`,
        },
        user,
      });
      existingBills.add(row.voucherNo);
      summary.created.push({
        voucherNo: row.voucherNo,
        party: row.party,
        cases: row.quantity,
        date: row.date.toLocaleDateString('en-IN'),
        scheme: target.schemeSnapshot?.name,
      });
    } catch (err) {
      summary.skipped.push({ voucherNo: row.voucherNo, party: row.party, reason: err.message });
    }
  }

  return finishSummary(summary, { filename, emailDate, emailSubject });
}

/**
 * Flattens the summary and records the run in the ReportImport collection —
 * the dashboard reads the latest record, and the email job resumes from the
 * newest emailDate. Recording is best-effort: a failure never undoes the
 * dispatches that were already imported.
 */
async function finishSummary(summary, { filename, emailDate, emailSubject }) {
  const result = { ...summary, unmatchedParties: [...summary.unmatchedParties].sort() };
  try {
    await ReportImport.create({
      source: emailDate ? 'EMAIL' : 'FILE',
      emailDate: emailDate || undefined,
      emailSubject: emailSubject || undefined,
      filename,
      invoicesInFile: result.totalInvoices,
      dispatchesCreated: result.created.length,
      casesAdded: result.created.reduce((s, c) => s + (c.cases || 0), 0),
      duplicates: result.duplicates,
      unmatchedParties: result.unmatchedParties.length,
      skipped: result.skipped.length,
      created: result.created.slice(0, 100),
    });
  } catch (err) {
    console.error('Failed to record report import:', err.message);
  }
  return result;
}
