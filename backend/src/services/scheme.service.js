import Scheme from '../models/Scheme.js';
import SchemeRegistration from '../models/SchemeRegistration.js';
import ApiError from '../utils/ApiError.js';
import { logAudit } from './audit.service.js';

export function listSchemes({ activeOnly } = {}) {
  const filter = activeOnly ? { isActive: true } : {};
  return Scheme.find(filter).sort('-createdAt').lean();
}

export async function createScheme(body, user) {
  const scheme = await Scheme.create({ ...body, createdBy: user._id });
  await logAudit({ action: 'SCHEME_CREATED', user, scheme: scheme._id, message: `Scheme "${scheme.name}" created` });
  return scheme;
}

export async function updateScheme(id, body, user) {
  const scheme = await Scheme.findByIdAndUpdate(id, body, { new: true, runValidators: true });
  if (!scheme) throw new ApiError(404, 'Scheme not found');
  await logAudit({ action: 'SCHEME_UPDATED', user, scheme: scheme._id, message: `Scheme "${scheme.name}" updated` });
  return scheme;
}

export async function deleteScheme(id, user) {
  const scheme = await Scheme.findById(id);
  if (!scheme) throw new ApiError(404, 'Scheme not found');

  const inUse = await SchemeRegistration.exists({ scheme: id });
  if (inUse) {
    throw new ApiError(409, 'This scheme has registrations and cannot be deleted. Mark it inactive instead.');
  }

  await scheme.deleteOne();
  await logAudit({ action: 'SCHEME_DELETED', user, message: `Scheme "${scheme.name}" deleted` });
}
