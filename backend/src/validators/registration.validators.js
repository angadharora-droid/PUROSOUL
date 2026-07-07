import { body } from 'express-validator';
import { PAYMENT_MODES } from '../config/constants.js';
import { startOfDay } from '../utils/helpers.js';

export const createRegistrationRules = [
  body('partyName').trim().notEmpty().withMessage('Party name is required').isLength({ max: 120 }),
  body('scheme').isMongoId().withMessage('A scheme must be selected'),
  body('advanceAmount').isFloat({ min: 0 }).withMessage('Advance payment must be a positive number').toFloat(),
  body('paymentMode').isIn(PAYMENT_MODES).withMessage('Invalid payment mode'),
  body('utrNumber').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
  body('registrationDate')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Invalid registration date')
    .custom((value) => {
      if (new Date(value) < startOfDay()) {
        throw new Error('Registration date cannot be in the past');
      }
      return true;
    }),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
];
