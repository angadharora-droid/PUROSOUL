import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logAudit } from '../services/audit.service.js';

export const list = asyncHandler(async (_req, res) => {
  const users = await User.find().sort('-createdAt');
  res.json({ success: true, data: users });
});

export const create = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await User.findOne({ email });
  if (exists) throw new ApiError(409, 'A user with this email already exists');

  const user = await User.create({ name, email, password, role });
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
  await user.save();

  await logAudit({ action: 'USER_UPDATED', user: req.user, message: `User "${user.name}" updated` });
  res.json({ success: true, data: user, message: 'User updated' });
});
