import { body } from 'express-validator';

export const createDispatchRules = [
  body('registration').isMongoId().withMessage('Registration id is required'),
  body('dispatchDate').isISO8601().withMessage('A valid dispatch date is required'),
  body('billNumber').trim().notEmpty().withMessage('Sales bill number is required').isLength({ max: 40 }),
  body('vehicleNumber').optional({ values: 'falsy' }).trim().isLength({ max: 20 }),
  body('cases250ml').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('250 ml cases must be 0 or more').toInt(),
  body('cases500ml').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('500 ml cases must be 0 or more').toInt(),
  body('cases1l').optional({ values: 'falsy' }).isInt({ min: 0 }).withMessage('1 litre cases must be 0 or more').toInt(),
  body('remarks').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body().custom((_value, { req }) => {
    const total =
      (Number(req.body.cases250ml) || 0) +
      (Number(req.body.cases500ml) || 0) +
      (Number(req.body.cases1l) || 0);
    if (total <= 0) throw new Error('At least one case must be dispatched');
    return true;
  }),
];
