import { Router } from 'express';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import { directoryGuard } from '../lib/ssoClient.js';

const router = Router();

// GET /api/sso/users — user directory for the central sign-on admin screen, so
// accounts can be matched to portal logins without pasting a CSV. Reachable only
// with the shared secret. The projection names the public fields explicitly;
// password and lock state are select:false on the model and never leave the server.
router.get(
  '/users',
  directoryGuard,
  asyncHandler(async (_req, res) => {
    const users = await User.find({ isActive: true }, 'name email role').sort({ name: 1 }).lean();
    res.json(users.map((u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role })));
  })
);

export default router;
