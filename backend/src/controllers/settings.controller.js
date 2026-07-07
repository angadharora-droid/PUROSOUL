import asyncHandler from '../utils/asyncHandler.js';
import { getNotificationEmails, setNotificationEmails } from '../services/settings.service.js';

export const getEmails = asyncHandler(async (_req, res) => {
  const emails = await getNotificationEmails();
  res.json({ success: true, data: { emails } });
});

export const updateEmails = asyncHandler(async (req, res) => {
  const emails = await setNotificationEmails(req.body.emails, req.user);
  res.json({ success: true, data: { emails }, message: 'Validation email recipients saved' });
});
