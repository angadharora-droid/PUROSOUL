import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from '../services/audit.service.js';
import { phonesMatch, isValidPasswordForRole, passwordRuleMessage } from '../utils/credentials.js';

/** True when another user already has this phone number (compared on digits, not formatting). */
async function phoneTaken(phone, excludeId) {
  const query = { phone: { $exists: true, $nin: [null, ''] } };
  if (excludeId) query._id = { $ne: excludeId };
  const others = await User.find(query).select('phone');
  return others.some((u) => phonesMatch(u.phone, phone));
}

export const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort('-createdAt');
  res.json({ success: true, data: users });
});

export const create = asyncHandler(async (req, res) => {
  const { name, email, password, role, phone } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'A user with this email already exists');
  if (phone && (await phoneTaken(phone))) {
    throw new ApiError(409, 'A user with this phone number already exists');
  }

  const user = await User.create({ name, email, password, role, phone: phone || undefined });
  await logAudit({ action: 'USER_CREATED', user: req.user, message: `User "${user.name}" (${user.role}) created` });
  res.status(201).json({ success: true, data: user, message: 'User created' });
});

export const update = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === String(req.user._id) && req.body.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own account');
  }

  if (typeof req.body.isActive === 'boolean') user.isActive = req.body.isActive;
  if (req.body.role) user.role = req.body.role;

  if (req.body.phone !== undefined) {
    const phone = req.body.phone || undefined;
    if (phone && (await phoneTaken(phone, user._id))) {
      throw new ApiError(409, 'A user with this phone number already exists');
    }
    user.phone = phone;
  }

  if (req.body.password) {
    // Validate against the target account's role (after any role change above).
    if (!isValidPasswordForRole(req.body.password, user.role)) {
      throw new ApiError(422, passwordRuleMessage(user.role));
    }
    user.password = req.body.password;
  }

  await user.save();

  await logAudit({ action: 'USER_UPDATED', user: req.user, message: `User "${user.name}" updated` });
  res.json({ success: true, data: user, message: 'User updated' });
});
