import { Router } from 'express';
import { getEmails, updateEmails } from '../controllers/settings.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { emailsRules } from '../validators/settings.validators.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/emails', getEmails);
router.put('/emails', emailsRules, validate, updateEmails);

export default router;
