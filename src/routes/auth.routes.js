const router = require('express').Router();
const ctrl   = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate, authRules } = require('../middleware/validate');

// ── Public ─────────────────────────────────────────────────
router.post('/send-otp',   authRules.sendOtp,   validate, ctrl.sendOtpHandler);
router.post('/verify-otp', authRules.verifyOtp, validate, ctrl.verifyOtpHandler);
router.post('/register',   authRules.register,  validate, ctrl.registerHandler);
router.post('/refresh',    ctrl.refreshHandler);

// ── Protected ──────────────────────────────────────────────
router.use(protect);

router.post  ('/logout',          ctrl.logoutHandler);
router.get   ('/me',              ctrl.getMeHandler);
router.put   ('/me',              ctrl.updateMeHandler);
router.post  ('/address',         ctrl.addAddressHandler);
router.delete('/address/:id',     ctrl.deleteAddressHandler);

module.exports = router;
