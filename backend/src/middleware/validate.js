import { validationResult } from 'express-validator';

/** Terminates the request with 422 if any express-validator chain reported an error. */
export default function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const errors = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path,
    message: e.msg,
  }));

  return res.status(422).json({ success: false, message: errors[0].message, errors });
}
