import { Router } from 'express';
import { login, me, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { loginRules, changePasswordRules } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', loginRules, validate, login);
router.get('/me', protect, me);
router.patch('/password', protect, changePasswordRules, validate, changePassword);

export default router;
