import { Router } from 'express';
import { create, listByRegistration } from '../controllers/dispatch.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createDispatchRules } from '../validators/dispatch.validators.js';

const router = Router();

router.use(protect);

router.post('/', authorize('sales', 'admin'), createDispatchRules, validate, create);
router.get('/:registrationId', listByRegistration);

export default router;
