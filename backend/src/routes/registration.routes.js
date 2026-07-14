import { Router } from 'express';
import * as registrationController from '../controllers/registration.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import validate from '../middleware/validate.js';
import { createRegistrationRules } from '../validators/registration.validators.js';

const router = Router();

router.use(protect);

router.post(
  '/',
  authorize('sales', 'admin'),
  upload.single('screenshot'),
  createRegistrationRules,
  validate,
  registrationController.create
);
router.patch(
  '/:id/screenshot',
  authorize('sales', 'admin'),
  upload.single('screenshot'),
  registrationController.updateScreenshot
);
router.get('/', registrationController.list);
router.get('/:id', registrationController.getOne);
router.get('/:id/timeline', registrationController.timeline);

export default router;
