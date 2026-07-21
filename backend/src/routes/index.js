import { Router } from 'express';
import authRoutes from './auth.routes.js';
import schemeRoutes from './scheme.routes.js';
import registrationRoutes from './registration.routes.js';
import dispatchRoutes from './dispatch.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import reportRoutes from './report.routes.js';
import userRoutes from './user.routes.js';
import settingsRoutes from './settings.routes.js';
import { print } from '../controllers/registration.controller.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/schemes', schemeRoutes);
router.use('/registrations', registrationRoutes);
router.use('/dispatches', dispatchRoutes);
router.use('/dispatch', dispatchRoutes); // spec-compatible alias
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);
router.use('/settings', settingsRoutes);
router.get('/print/:registrationId', protect, print);

export default router;
