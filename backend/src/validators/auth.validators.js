import { body } from 'express-validator';
import { isValidPasswordForRole, passwordRuleMessage } from '../utils/credentials.js';

export const loginRules = [
  body('identifier')
    .isString()
    .withMessage('Email or phone number is required')
    .trim()
    .notEmpty()
    .withMessage('Email or phone number is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const changePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').custom((value, { req }) => {
    if (!isValidPasswordForRole(value, req.user?.role)) {
      throw new Error(passwordRuleMessage(req.user?.role));
    }
    return true;
  }),
];
