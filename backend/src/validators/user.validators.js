import { body } from 'express-validator';
import { ROLES } from '../config/constants.js';
import { isValidPasswordForRole, passwordRuleMessage } from '../utils/credentials.js';

const phoneRule = body('phone')
  .optional({ values: 'falsy' })
  .isString()
  .trim()
  .custom((value) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new Error('Phone number must contain 10 to 15 digits');
    }
    return true;
  });

export const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').custom((value, { req }) => {
    const role = req.body.role || 'sales';
    if (!isValidPasswordForRole(value, role)) throw new Error(passwordRuleMessage(role));
    return true;
  }),
  body('role').isIn(ROLES).withMessage('Invalid role'),
  phoneRule,
];

export const updateUserRules = [
  body('isActive').optional().isBoolean().toBoolean(),
  body('role').optional().isIn(ROLES).withMessage('Invalid role'),
  // Role-aware strength check happens in the controller, where the target user's role is known.
  body('password').optional().isString().notEmpty().withMessage('Password cannot be empty'),
  phoneRule,
];
