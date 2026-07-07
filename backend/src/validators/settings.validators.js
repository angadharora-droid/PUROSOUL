import { body } from 'express-validator';

export const emailsRules = [
  body('emails').isArray({ max: 20 }).withMessage('Emails must be a list of at most 20 addresses'),
  body('emails.*').isEmail().withMessage('Every entry must be a valid email address').normalizeEmail(),
];
