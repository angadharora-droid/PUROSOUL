import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { signToken } from '../middleware/auth.js';
import { phonesMatch } from '../utils/credentials.js';
import { MAX_LOGIN_ATTEMPTS, LOGIN_LOCK_MINUTES } from '../config/constants.js';

const CREDENTIAL_FIELDS = '+password +loginAttempts +lockUntil';

/** Email identifiers match any user; phone identifiers match admin accounts only. */
async function findUserByIdentifier(identifier) {
  if (identifier.includes('@')) {
    return User.findOne({ email: identifier.trim().toLowerCase() }).select(CREDENTIAL_FIELDS);
  }
  const admins = await User.find({ role: 'admin', phone: { $exists: true, $nin: [null, ''] } }).select(
    CREDENTIAL_FIELDS
  );
  return admins.find((admin) => phonesMatch(admin.phone, identifier)) || null;
}

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const user = await findUserByIdentifier(identifier);
  if (!user) throw new ApiError(401, 'Invalid credentials');

  if (user.lockUntil && user.lockUntil > Date.now()) {
    const minutes = Math.ceil((user.lockUntil - Date.now()) / 60000);
    throw new ApiError(423, `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`);
  }

  if (!(await user.comparePassword(password))) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOGIN_LOCK_MINUTES * 60 * 1000);
      user.loginAttempts = 0;
    }
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, 'Invalid credentials');
  }

  if (user.loginAttempts > 0 || user.lockUntil) {
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save({ validateBeforeSave: false });
  }

  if (!user.isActive) throw new ApiError(403, 'Your account has been deactivated');

  const token = signToken(user);
  res.json({ success: true, data: { token, user: user.toJSON() } });
});

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});
