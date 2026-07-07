import { body } from 'express-validator';
import { ROLES } from '../config/constants.js';

export const createUserRules = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
  body('email').isEmail().withMessage('A valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(ROLES).withMessage('Invalid role'),
];

export const updateUserRules = [
  body('isActive').optional().isBoolean().toBoolean(),
  body('role').optional().isIn(ROLES).withMessage('Invalid role'),
];
