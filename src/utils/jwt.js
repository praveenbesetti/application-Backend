const jwt = require('jsonwebtoken');

const SECRET          = process.env.JWT_SECRET;
const EXPIRES_IN      = process.env.JWT_EXPIRES_IN || '7d';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

if (!SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables');
}

// Generate access token
const signAccess = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });

// Generate refresh token
const signRefresh = (payload) =>
  jwt.sign(payload, SECRET, { expiresIn: REFRESH_EXPIRES });

// Verify token — returns payload or throws
const verify = (token) => jwt.verify(token, SECRET);

// Generate both tokens at once
const generateTokens = (user) => {
  const payload = {
    id:    user._id,
    phone: user.phone,
    role:  user.role,
  };
  return {
    accessToken:  signAccess(payload),
    refreshToken: signRefresh({ id: user._id }),
  };
};

module.exports = { signAccess, signRefresh, verify, generateTokens };
