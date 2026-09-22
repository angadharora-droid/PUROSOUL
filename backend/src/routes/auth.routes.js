import { Router } from 'express';
import { login, ssoLogin, me, changePassword } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { loginRules, changePasswordRules } from '../validators/auth.validators.js';

const router = Router();

router.post('/login', loginRateLimiter, loginRules, validate, login);
// Central sign-on from the CPG portal (no-op until AUTH_SERVICE_URL is set).
router.post('/sso', loginRateLimiter, ssoLogin);
router.get('/me', protect, me);
router.patch('/password', protect, changePasswordRules, validate, changePassword);

export default router;
