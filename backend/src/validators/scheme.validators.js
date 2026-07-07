import { body } from 'express-validator';

export const schemeRules = [
  body('name').trim().notEmpty().withMessage('Scheme name is required').isLength({ max: 120 }),
  body('advanceAmount').isFloat({ min: 0 }).withMessage('Advance payment must be a positive number').toFloat(),
  body('benefitPerCase').isFloat({ min: 0 }).withMessage('Benefit per case must be a positive number').toFloat(),
  body('targetCases').isInt({ min: 1 }).withMessage('Sales target must be at least 1 case').toInt(),
  body('validityDays').isInt({ min: 1 }).withMessage('Validity must be at least 1 day').toInt(),
  body('description').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
  body('isActive').optional().isBoolean().toBoolean(),
];
