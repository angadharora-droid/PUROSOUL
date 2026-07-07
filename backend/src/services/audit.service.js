import AuditLog from '../models/AuditLog.js';

/** Writes an audit entry. Never throws — auditing must not break the main flow. */
export async function logAudit({ action, user, registration, scheme, message, meta }) {
  try {
    await AuditLog.create({
      action,
      user: user?._id || user,
      registration,
      scheme,
      message,
      meta,
    });
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

export function getRegistrationTimeline(registrationId) {
  return AuditLog.find({ registration: registrationId })
    .sort('createdAt')
    .populate('user', 'name role')
    .lean();
}
