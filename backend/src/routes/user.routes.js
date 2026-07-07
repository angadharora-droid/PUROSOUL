import { Router } from 'express';
import { list, create, update } from '../controllers/user.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createUserRules, updateUserRules } from '../validators/user.validators.js';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/', list);
router.post('/', createUserRules, validate, create);
router.patch('/:id', updateUserRules, validate, update);

export default router;
