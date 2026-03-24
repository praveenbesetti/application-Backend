const User           = require('../models/User');
const { generateOtp, sendOtp } = require('../utils/otp');
const { generateTokens, verify } = require('../utils/jwt');

// ─────────────────────────────────────────────────────────
// POST /api/auth/send-otp
// Body: { phone }
// Sends OTP to phone number. Creates user if not exists.
// ─────────────────────────────────────────────────────────
const sendOtpHandler = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Find or create user
    let user = await User.findOne({ phone }).select('+otp');
    if (!user) {
      user = new User({ phone });
    }

    // Generate OTP
    const otp = generateOtp();
    console.log(otp)
    // Hash and store OTP on user
    await user.setOtp(otp);

    // Send SMS
    const result = await sendOtp(phone, otp);

    res.json({
      success:  true,
      message:  `OTP sent to +91${phone}`,
      isNewUser: !user.isPhoneVerified,
      // Only return OTP in development
      ...(process.env.NODE_ENV !== 'production' && { otp: result.otp }),
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
// Body: { phone, otp, name?, email? }
// Verifies OTP → returns JWT tokens
// ─────────────────────────────────────────────────────────
const verifyOtpHandler = async (req, res, next) => {
  try {
    const { phone, otp, name, email } = req.body;

    const user = await User.findOne({ phone }).select('+otp +refreshToken');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found. Please request OTP first.' });
    }

    // Verify OTP
    const result = await user.verifyOtp(otp);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.reason });
    }

    // Update profile if provided
    if (name  && !user.name)  user.name  = name;
    if (email && !user.email) user.email = email;

    // Update last login
    user.lastLoginAt = new Date();

    // Generate tokens
    const tokens = generateTokens(user);

    // Store refresh token (hashed in production)
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user:         user.toJSON(),
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/register
// Body: { phone, name, email? }
// Complete profile after OTP verification
// ─────────────────────────────────────────────────────────
const registerHandler = async (req, res, next) => {
  try {
    const { phone, name, email } = req.body;

    const user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'Please verify phone first' });
    }
    if (!user.isPhoneVerified) {
      return res.status(400).json({ success: false, message: 'Phone not verified' });
    }

    // Update profile
    if (name)  user.name  = name;
    if (email) user.email = email;
    await user.save();

    const tokens = generateTokens(user);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user:         user.toJSON(),
        accessToken:  tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/refresh
// Body: { refreshToken }
// Returns new access token
// ─────────────────────────────────────────────────────────
const refreshHandler = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = verify(refreshToken);
    const user    = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    }

    const tokens = generateTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    res.json({
      success:      true,
      accessToken:  tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears refresh token
// ─────────────────────────────────────────────────────────
const logoutHandler = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns current user profile
// ─────────────────────────────────────────────────────────
const getMeHandler = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// ─────────────────────────────────────────────────────────
// PUT /api/auth/me
// Update profile
// ─────────────────────────────────────────────────────────
const updateMeHandler = async (req, res, next) => {
  try {
    const allowed = ['name', 'email', 'avatar'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/address
// Add new address
// ─────────────────────────────────────────────────────────
const addAddressHandler = async (req, res, next) => {
  try {
    const { label, line1, line2, city, state, pincode, lat, lng, isDefault } = req.body;

    const user = await User.findById(req.user._id);

    // If this is default, unset all others
    if (isDefault) {
      user.addresses.forEach(addr => { addr.isDefault = false; });
    }

    user.addresses.push({ label, line1, line2, city, state, pincode, lat, lng, isDefault });
    await user.save();

    res.status(201).json({ success: true, data: user.addresses });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/auth/address/:id
const deleteAddressHandler = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(a => a._id.toString() !== req.params.id);
    await user.save();
    res.json({ success: true, data: user.addresses });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendOtpHandler, verifyOtpHandler, registerHandler,
  refreshHandler, logoutHandler,
  getMeHandler, updateMeHandler,
  addAddressHandler, deleteAddressHandler,
};
