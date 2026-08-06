import ApiError from '../utils/ApiError.js';
import { LOGIN_RATE_WINDOW_MS, LOGIN_RATE_MAX } from '../config/constants.js';

/** Simple in-memory fixed-window rate limiter, keyed per IP. */
export function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  return (req, _res, next) => {
    const now = Date.now();

    if (hits.size > 1000) {
      for (const [key, entry] of hits) {
        if (now >= entry.resetAt) hits.delete(key);
      }
    }

    let entry = hits.get(req.ip);
    if (!entry || now >= entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(req.ip, entry);
    }
    entry.count += 1;

    if (entry.count > max) return next(new ApiError(429, message));
    next();
  };
}

export const loginRateLimiter = rateLimit({
  windowMs: LOGIN_RATE_WINDOW_MS,
  max: LOGIN_RATE_MAX,
  message: 'Too many login attempts from this device. Please try again in a few minutes.',
});
