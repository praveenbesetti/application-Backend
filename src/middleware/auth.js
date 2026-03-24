const { verify } = require('../utils/jwt');
const User = require('../models/User');

// ─────────────────────────────────────────────────────────
// PROTECT — requires valid JWT access token
// ─────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verify(token);

    // Attach user to request
    const user = await User.findById(decoded.id).select('-password -otp -refreshToken');
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: 'User not found or inactive' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ─────────────────────────────────────────────────────────
// ADMIN ONLY — protect + role check
// ─────────────────────────────────────────────────────────
const adminOnly = async (req, res, next) => {
  await protect(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  });
};

// ─────────────────────────────────────────────────────────
// OPTIONAL AUTH — attach user if token present, don't fail if not
// Useful for product pages where we want user context if logged in
// ─────────────────────────────────────────────────────────
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token   = authHeader.split(' ')[1];
      const decoded = verify(token);
      req.user      = await User.findById(decoded.id).select('-password -otp -refreshToken');
    }
  } catch (_) {
    // silently ignore — user just won't be attached
  }
  next();
};

module.exports = { protect, adminOnly, optionalAuth };
