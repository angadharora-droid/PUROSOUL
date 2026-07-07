import Setting from '../models/Setting.js';
import { logAudit } from './audit.service.js';

const VALIDATION_EMAILS_KEY = 'validationEmails';

/** Addresses that receive the validation email whenever a registration is saved. */
export async function getNotificationEmails() {
  const doc = await Setting.findOne({ key: VALIDATION_EMAILS_KEY }).lean();
  return Array.isArray(doc?.value) ? doc.value : [];
}

export async function setNotificationEmails(emails, user) {
  const clean = [...new Set(emails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))];

  await Setting.findOneAndUpdate(
    { key: VALIDATION_EMAILS_KEY },
    { value: clean },
    { upsert: true, new: true }
  );

  await logAudit({
    action: 'SETTINGS_UPDATED',
    user,
    message: `Validation email recipients updated (${clean.length}): ${clean.join(', ') || 'none'}`,
  });

  return clean;
}
