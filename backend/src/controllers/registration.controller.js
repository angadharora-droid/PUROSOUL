import asyncHandler from '../utils/asyncHandler.js';
import * as registrationService from '../services/registration.service.js';
import { getRegistrationTimeline } from '../services/audit.service.js';

export const create = asyncHandler(async (req, res) => {
  const registration = await registrationService.createRegistration({
    body: req.body,
    file: req.file,
    user: req.user,
  });
  res.status(201).json({
    success: true,
    data: registration,
    message: 'Registration saved — validation email sent to the configured recipients',
  });
});

export const list = asyncHandler(async (req, res) => {
  const result = await registrationService.listRegistrations(req.query);
  res.json({ success: true, data: result });
});

export const getOne = asyncHandler(async (req, res) => {
  const registration = await registrationService.getRegistration(req.params.id);
  res.json({ success: true, data: registration });
});

export const timeline = asyncHandler(async (req, res) => {
  const logs = await getRegistrationTimeline(req.params.id);
  res.json({ success: true, data: logs });
});

export const print = asyncHandler(async (req, res) => {
  const payload = await registrationService.getPrintPayload(req.params.registrationId, req.user);
  res.json({ success: true, data: payload });
});
