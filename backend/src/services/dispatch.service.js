import Dispatch from '../models/Dispatch.js';
import SchemeRegistration from '../models/SchemeRegistration.js';
import ApiError from '../utils/ApiError.js';
import { startOfDay, endOfDay } from '../utils/helpers.js';
import { logAudit } from './audit.service.js';
import { sendTargetAchievedEmail } from './email.service.js';
import { decorate } from './registration.service.js';

export async function addDispatch({ body, user }) {
  const registration = await SchemeRegistration.findById(body.registration).populate(
    'createdBy',
    'name email'
  );
  if (!registration) throw new ApiError(404, 'Registration not found');

  // Lazily expire before validating the dispatch window (day-granular: the whole expiry day is valid).
  if (registration.status === 'ACTIVE' && endOfDay(registration.expiryDate) < new Date()) {
    registration.status = 'EXPIRED';
    registration.benefitEarned = 0;
    await registration.save();
  }

  if (!['ACTIVE', 'COMPLETED'].includes(registration.status)) {
    throw new ApiError(400, `Dispatches can only be added to active schemes (current status: ${registration.status})`);
  }

  // Compare at day granularity: activation carries a time-of-day, so a dispatch on the
  // registration/activation day itself (and on the expiry day) must be allowed.
  const dispatchDate = new Date(body.dispatchDate);
  if (dispatchDate < startOfDay(registration.activationDate)) {
    throw new ApiError(422, 'Dispatch date cannot be before the scheme activation date');
  }
  if (dispatchDate > endOfDay(registration.expiryDate)) {
    throw new ApiError(422, 'Dispatches cannot be added after the scheme expiry date');
  }

  const billNumber = body.billNumber.trim().toUpperCase();
  const duplicate = await Dispatch.findOne({ billNumber }).lean();
  if (duplicate) throw new ApiError(409, `Bill number "${billNumber}" has already been used`);

  const dispatch = await Dispatch.create({
    registration: registration._id,
    dispatchDate,
    billNumber,
    vehicleNumber: body.vehicleNumber || undefined,
    cases250ml: body.cases250ml || 0,
    cases500ml: body.cases500ml || 0,
    cases1l: body.cases1l || 0,
    // Email imports only know the total; manual entries derive it from the size split.
    totalCases: body.totalCases || 0,
    remarks: body.remarks || undefined,
    source: body.source || 'MANUAL',
    createdBy: user._id,
  });

  // Recompute achieved cases from the source of truth.
  const [agg] = await Dispatch.aggregate([
    { $match: { registration: registration._id } },
    { $group: { _id: null, total: { $sum: '$totalCases' } } },
  ]);
  registration.currentCases = agg?.total || 0;

  const { targetCases, benefitPerCase } = registration.schemeSnapshot;
  let completedNow = false;
  if (registration.status === 'ACTIVE' && registration.currentCases >= targetCases) {
    registration.status = 'COMPLETED';
    registration.completedAt = new Date();
    completedNow = true;
  }
  // Benefit = achieved cases × benefit per case, and keeps growing while the scheme is valid.
  if (registration.status === 'COMPLETED') {
    registration.benefitEarned = registration.currentCases * benefitPerCase;
  }
  await registration.save();

  await logAudit({
    action: 'DISPATCH_ADDED',
    user,
    registration: registration._id,
    message: `Dispatch ${billNumber} added — ${dispatch.totalCases} cases`,
    meta: { billNumber, totalCases: dispatch.totalCases },
  });

  if (completedNow) {
    await logAudit({
      action: 'REGISTRATION_COMPLETED',
      user,
      registration: registration._id,
      message: `Sales target achieved: ${registration.currentCases}/${targetCases} cases`,
    });
    sendTargetAchievedEmail(registration).catch((err) =>
      console.error('Completion email failed:', err.message)
    );
  }

  return { dispatch, registration: decorate(registration) };
}

export function listDispatches(registrationId) {
  return Dispatch.find({ registration: registrationId })
    .sort('-dispatchDate')
    .populate('createdBy', 'name')
    .lean();
}
