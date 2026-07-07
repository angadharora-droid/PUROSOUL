import nodemailer from 'nodemailer';
import env from '../config/env.js';
import { getNotificationEmails } from './settings.service.js';

let transporter = null;
if (env.smtp.host && env.smtp.user) {
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
}

const dateFmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function layout(title, rows) {
  const tr = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;background:#f9fafb;font-weight:600;">${label}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${value}</td>
      </tr>`
    )
    .join('');
  return `
  <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#145AE2;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0;">
      <h2 style="margin:0;font-size:18px;">${title}</h2>
      <p style="margin:2px 0 0;font-size:11px;opacity:.85;">Puro Soul — Where Purity Lives in Every Drop</p>
    </div>
    <div style="border:1px solid #e1e8ed;border-top:0;padding:20px;border-radius:0 0 10px 10px;">
      <table style="border-collapse:collapse;width:100%;font-size:14px;">${tr}</table>
      <p style="color:#757575;font-size:12px;margin-top:16px;">
        This is an automated message from the Puro Soul Scheme Tracker.
      </p>
    </div>
  </div>`;
}

async function send({ to, subject, html, attachments }) {
  const recipients = [...new Set(to.filter(Boolean))];
  if (!recipients.length) return [];
  if (!transporter) {
    console.warn(`[email disabled] Would send "${subject}" to ${recipients.join(', ')}`);
    return recipients;
  }
  await transporter.sendMail({ from: env.smtp.from, to: recipients.join(', '), subject, html, attachments });
  return recipients;
}

/** Admin-configured recipients (Settings → Validation Emails), falling back to ACCOUNTS_EMAIL. */
async function resolveRecipients(extra = []) {
  const configured = await getNotificationEmails();
  const base = configured.length ? configured : [env.accountsEmail];
  return [...base, ...extra];
}

/**
 * Sent automatically when a registration is saved: shares the registration and
 * payment details (plus a PDF summary) with every configured recipient.
 * Returns the list of recipients the mail went to.
 */
export async function sendValidationEmail(registration, attachments = []) {
  const snap = registration.schemeSnapshot;
  return send({
    to: await resolveRecipients(),
    subject: `Scheme Registration — ${registration.partyName}`,
    attachments,
    html: layout('Scheme Registration', [
      ['Party Name', registration.partyName],
      ['Scheme', snap.name],
      ['Advance Paid', inr(registration.advanceAmount)],
      ['Payment Mode', registration.paymentMode],
      ['UTR Number', registration.utrNumber || '—'],
      ['Activation Date', dateFmt.format(registration.activationDate)],
      ['Expiry Date', dateFmt.format(registration.expiryDate)],
      ['Sales Target', `${snap.targetCases.toLocaleString('en-IN')} cases`],
    ]),
  });
}

/** Sent when the sales target is achieved before expiry. */
export async function sendTargetAchievedEmail(registration) {
  const snap = registration.schemeSnapshot;
  return send({
    to: await resolveRecipients([registration.createdBy?.email]),
    subject: `Scheme Target Achieved — ${registration.partyName}`,
    html: layout('Scheme Target Achieved 🎉', [
      ['Party Name', registration.partyName],
      ['Scheme', snap.name],
      ['Sales Target', `${snap.targetCases.toLocaleString('en-IN')} cases`],
      ['Achieved Cases', `${registration.currentCases.toLocaleString('en-IN')} cases`],
      ['Benefit Earned', inr(registration.benefitEarned)],
    ]),
  });
}
