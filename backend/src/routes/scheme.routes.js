import { Router } from 'express';
import { list, create, update, remove } from '../controllers/scheme.controller.js';
import { protect, authorize } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { schemeRules } from '../validators/scheme.validators.js';

const router = Router();

router.use(protect);

router.get('/', list);
router.post('/', authorize('admin'), schemeRules, validate, create);
router.put('/:id', authorize('admin'), schemeRules, validate, update);
router.delete('/:id', authorize('admin'), remove);

export default router;
