const { validationResult, body } = require('express-validator');

// Run validations and return errors if any
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: errors.array()[0].msg,
      errors:  errors.array().map(e => ({ field: e.path, msg: e.msg })),
    });
  }
  next();
};

// ── Validation rule sets ──────────────────────────────────

const authRules = {
  sendOtp: [
    body('phone')
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Enter a valid 10-digit Indian mobile number'),
  ],
  verifyOtp: [
    body('phone')
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Enter a valid 10-digit Indian mobile number'),
    body('otp')
      .trim()
      .isLength({ min: 4, max: 8 })
      .withMessage('Invalid OTP'),
  ],
  register: [
    body('phone')
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Enter a valid 10-digit Indian mobile number'),
    body('name')
      .trim()
      .isLength({ min: 2, max: 60 })
      .withMessage('Name must be 2-60 characters'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Enter a valid email address'),
  ],
};

const cartRules = {
  addItem: [
    body('productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('qty')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Quantity must be between 1 and 50'),
  ],
  removeItem: [
    body('productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('qty')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be at least 1'),
  ],
};

module.exports = { validate, authRules, cartRules };
