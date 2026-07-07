import asyncHandler from '../utils/asyncHandler.js';
import * as dispatchService from '../services/dispatch.service.js';

export const create = asyncHandler(async (req, res) => {
  const result = await dispatchService.addDispatch({ body: req.body, user: req.user });
  res.status(201).json({ success: true, data: result, message: 'Dispatch entry added' });
});

export const listByRegistration = asyncHandler(async (req, res) => {
  const dispatches = await dispatchService.listDispatches(req.params.registrationId);
  res.json({ success: true, data: dispatches });
});
