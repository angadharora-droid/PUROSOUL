import SchemeRegistration from '../models/SchemeRegistration.js';
import Scheme from '../models/Scheme.js';
import Dispatch from '../models/Dispatch.js';
import ApiError from '../utils/ApiError.js';
import { addDays, endOfDay, escapeRegex, startOfDay } from '../utils/helpers.js';
import { logAudit, getRegistrationTimeline } from './audit.service.js';
import { sendValidationEmail as sendValidationEmailTemplate } from './email.service.js';
import { buildRegistrationPdf } from './pdf.service.js';

/**
 * Marks every overdue ACTIVE registration as EXPIRED (lazy evaluation, run before reads).
 * Expiry is day-granular: a scheme stays valid through the whole of its expiry day,
 * regardless of the time-of-day stored on expiryDate.
 */
export async function expireOverdue() {
  const res = await SchemeRegistration.updateMany(
    { status: 'ACTIVE', expiryDate: { $lt: startOfDay() } },
    { $set: { status: 'EXPIRED', benefitEarned: 0 } }
  );
  return res.modifiedCount;
}

/** Derived progress figures used by the dashboard, lists and the printable report. */
export function computeProgress(reg) {
  const snap = reg.schemeSnapshot || {};
  const target = snap.targetCases || 0;
  const achieved = reg.currentCases || 0;
  const remaining = Math.max(0, target - achieved);
  const completionPercent = target > 0 ? Math.min(100, Math.round((achieved / target) * 1000) / 10) : 0;

  let daysLeft = null;
  if (reg.expiryDate && ['ACTIVE', 'COMPLETED'].includes(reg.status)) {
    // Count whole days: the expiry day itself counts as 1 day left.
    daysLeft = Math.max(0, Math.ceil((endOfDay(reg.expiryDate).getTime() - Date.now()) / 86400000));
  }

  const eligibleForBenefit =
    reg.status === 'COMPLETED' || (reg.status === 'ACTIVE' && target > 0 && achieved >= target);
  const benefitAmount = eligibleForBenefit ? achieved * (snap.benefitPerCase || 0) : 0;

  return {
    targetCases: target,
    achievedCases: achieved,
    remainingCases: remaining,
    completionPercent,
    daysLeft,
    eligibleForBenefit,
    benefitAmount,
  };
}

export function decorate(regDoc) {
  const reg = typeof regDoc.toObject === 'function' ? regDoc.toObject() : regDoc;
  return { ...reg, progress: computeProgress(reg) };
}

export async function createRegistration({ body, file, user }) {
  const scheme = await Scheme.findById(body.scheme);
  if (!scheme) throw new ApiError(404, 'Selected scheme not found');
  if (!scheme.isActive) throw new ApiError(400, 'The selected scheme is inactive');

  // The payment attachment (screenshot/receipt) is compulsory for every payment mode.
  if (!file) {
    throw new ApiError(422, 'A payment screenshot/attachment is required');
  }

  // The advance paid can never be below the scheme's advance payment.
  if (Number(body.advanceAmount) < scheme.advanceAmount) {
    throw new ApiError(
      422,
      `Advance payment cannot be less than ₹${scheme.advanceAmount.toLocaleString('en-IN')} for ${scheme.name}`
    );
  }

  const registrationDate = body.registrationDate ? new Date(body.registrationDate) : new Date();
  if (registrationDate < startOfDay()) {
    throw new ApiError(422, 'Registration date cannot be in the past');
  }

  // Schemes activate immediately on registration; validity runs from now.
  const activationDate = new Date();

  const registration = await SchemeRegistration.create({
    partyName: body.partyName,
    scheme: scheme._id,
    schemeSnapshot: {
      name: scheme.name,
      advanceAmount: scheme.advanceAmount,
      benefitPerCase: scheme.benefitPerCase,
      targetCases: scheme.targetCases,
      validityDays: scheme.validityDays,
    },
    registrationDate,
    advanceAmount: body.advanceAmount,
    paymentMode: body.paymentMode,
    utrNumber: body.utrNumber || undefined,
    screenshotUrl: `/uploads/${file.filename}`,
    remarks: body.remarks || undefined,
    status: 'ACTIVE',
    activationDate,
    // Deadline is a whole day, not a time: valid through the end of the last validity day.
    expiryDate: endOfDay(addDays(activationDate, scheme.validityDays)),
    createdBy: user._id,
  });

  await logAudit({
    action: 'REGISTRATION_CREATED',
    user,
    registration: registration._id,
    message: `Registration created for "${registration.partyName}" under scheme "${scheme.name}" — active until ${registration.expiryDate.toLocaleDateString('en-IN')}`,
  });

  // Validation email goes out automatically on save; a failure never blocks the save.
  notifyValidationEmail(registration, user);

  return decorate(registration);
}

async function notifyValidationEmail(registration, user) {
  try {
    await registration.populate('createdBy', 'name email');

    let attachments = [];
    try {
      const pdf = await buildRegistrationPdf(registration);
      const safeName = registration.partyName.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
      attachments = [
        { filename: `Scheme-Registration-${safeName}.pdf`, content: pdf, contentType: 'application/pdf' },
      ];
    } catch (err) {
      console.error('Registration PDF generation failed:', err.message);
    }

    const recipients = await sendValidationEmailTemplate(registration, attachments);
    if (recipients.length) {
      await logAudit({
        action: 'VALIDATION_EMAIL_SENT',
        user,
        registration: registration._id,
        message: `Registration email (with PDF) sent to ${recipients.join(', ')}`,
      });
    }
  } catch (err) {
    console.error('Registration email failed:', err.message);
  }
}

export async function listRegistrations(query) {
  await expireOverdue();

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.scheme) filter.scheme = query.scheme;
  if (query.q) {
    filter.partyName = new RegExp(escapeRegex(query.q.trim()), 'i');
  }
  if (query.from || query.to) {
    filter.registrationDate = {
      ...(query.from ? { $gte: startOfDay(new Date(query.from)) } : {}),
      ...(query.to ? { $lte: endOfDay(new Date(query.to)) } : {}),
    };
  }
  if (query.bill) {
    const rx = new RegExp(escapeRegex(query.bill.trim()), 'i');
    const ids = await Dispatch.find({ billNumber: rx }).distinct('registration');
    filter._id = { $in: ids };
  }

  const [items, total] = await Promise.all([
    SchemeRegistration.find(filter)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('scheme', 'name')
      .populate('createdBy', 'name'),
    SchemeRegistration.countDocuments(filter),
  ]);

  return { items: items.map(decorate), total, page, pages: Math.max(1, Math.ceil(total / limit)), limit };
}

export async function getRegistration(id) {
  await expireOverdue();
  const registration = await SchemeRegistration.findById(id)
    .populate('scheme', 'name isActive')
    .populate('createdBy', 'name email role');
  if (!registration) throw new ApiError(404, 'Registration not found');
  return decorate(registration);
}

/** Everything needed to render the printable A4 report. Also records the print in the audit log. */
export async function getPrintPayload(id, user) {
  await expireOverdue();
  const registration = await SchemeRegistration.findById(id).populate('createdBy', 'name email');
  if (!registration) throw new ApiError(404, 'Registration not found');

  const dispatches = await Dispatch.find({ registration: registration._id })
    .sort('dispatchDate')
    .populate('createdBy', 'name')
    .lean();

  const totals = dispatches.reduce(
    (acc, d) => ({
      cases250ml: acc.cases250ml + (d.cases250ml || 0),
      cases500ml: acc.cases500ml + (d.cases500ml || 0),
      cases1l: acc.cases1l + (d.cases1l || 0),
      totalCases: acc.totalCases + (d.totalCases || 0),
      trips: acc.trips + 1,
    }),
    { cases250ml: 0, cases500ml: 0, cases1l: 0, totalCases: 0, trips: 0 }
  );

  const timeline = await getRegistrationTimeline(registration._id);

  await logAudit({
    action: 'PRINT_GENERATED',
    user,
    registration: registration._id,
    message: `Scheme report printed for "${registration.partyName}"`,
  });

  return { registration: decorate(registration), dispatches, totals, timeline };
}
