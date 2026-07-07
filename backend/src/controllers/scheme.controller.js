import asyncHandler from '../utils/asyncHandler.js';
import * as schemeService from '../services/scheme.service.js';

export const list = asyncHandler(async (req, res) => {
  const schemes = await schemeService.listSchemes({ activeOnly: req.query.active === 'true' });
  res.json({ success: true, data: schemes });
});

export const create = asyncHandler(async (req, res) => {
  const scheme = await schemeService.createScheme(req.body, req.user);
  res.status(201).json({ success: true, data: scheme, message: 'Scheme created' });
});

export const update = asyncHandler(async (req, res) => {
  const scheme = await schemeService.updateScheme(req.params.id, req.body, req.user);
  res.json({ success: true, data: scheme, message: 'Scheme updated' });
});

export const remove = asyncHandler(async (req, res) => {
  await schemeService.deleteScheme(req.params.id, req.user);
  res.json({ success: true, message: 'Scheme deleted' });
});
