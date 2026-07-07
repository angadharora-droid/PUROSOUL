import jwt from 'jsonwebtoken';
import env from '../config/env.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

/** Requires a valid Bearer token and attaches the user document to req.user. */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');

  let payload;
  try {
    payload = jwt.verify(token, env.jwt.secret);
  } catch {
    throw new ApiError(401, 'Session expired or token invalid. Please log in again.');
  }

  const user = await User.findById(payload.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not found or deactivated.');

  req.user = user;
  next();
});

/** Restricts a route to the given roles. Use after protect. */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

export function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.jwt.secret, { expiresIn: env.jwt.expiresIn });
}
