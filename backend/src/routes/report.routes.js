import { Router } from 'express';
import { refreshReport } from '../controllers/report.controller.js';
import { protect, authorize } from '../middleware/auth.js';

const router = Router();

// Manually pull the latest sales-report email and (re-)import its workbook.
router.post('/refresh', protect, authorize('sales', 'admin'), refreshReport);

export default router;
