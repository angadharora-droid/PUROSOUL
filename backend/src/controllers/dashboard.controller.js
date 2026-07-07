import asyncHandler from '../utils/asyncHandler.js';
import { getDashboard } from '../services/dashboard.service.js';

export const dashboard = asyncHandler(async (_req, res) => {
  const data = await getDashboard();
  res.json({ success: true, data });
});
