const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ─────────────────────────────────────────────────────────
// ADDRESS SUB-SCHEMA
// ─────────────────────────────────────────────────────────
const AddressSchema = new mongoose.Schema({
  label:    { type: String, default: 'Home', enum: ['Home', 'Work', 'Other'] },
  line1:    { type: String, required: true },
  line2:    { type: String, default: '' },
  city:     { type: String, required: true },
  state:    { type: String, default: '' },
  pincode:  { type: String, required: true },
  lat:      { type: Number, default: null },
  lng:      { type: Number, default: null },
  isDefault:{ type: Boolean, default: false },
}, { _id: true, timestamps: true });

// ─────────────────────────────────────────────────────────
// OTP SUB-SCHEMA
// ─────────────────────────────────────────────────────────
const OtpSchema = new mongoose.Schema({
  code:      { type: String },                    // hashed OTP
  expiresAt: { type: Date },
  attempts:  { type: Number, default: 0 },        // wrong attempts
  verified:  { type: Boolean, default: false },
}, { _id: false });

// ─────────────────────────────────────────────────────────
// USER SCHEMA
// ─────────────────────────────────────────────────────────
const UserSchema = new mongoose.Schema({

  // ── Identity ─────────────────────────────────────────
  name:  { type: String, trim: true, default: '' },
  phone: {
    type:     String,
    required: true,
    unique:   true,
    index:    true,
    trim:     true,
    match:    [/^[6-9]\d{9}$/, 'Invalid Indian phone number'],
  },
  email: {
    type:      String,
    unique:    true,
    sparse:    true,       // allows multiple nulls
    lowercase: true,
    trim:      true,
  },

  // ── Auth ─────────────────────────────────────────────
  password:      { type: String, select: false },         // optional (email/pass login)
  otp:           { type: OtpSchema, select: false },      // current OTP
  isPhoneVerified:{ type: Boolean, default: false },
  isEmailVerified:{ type: Boolean, default: false },

  // ── Refresh token (for JWT rotation) ─────────────────
  refreshToken: { type: String, select: false },

  // ── Profile ──────────────────────────────────────────
  avatar:    { type: String, default: null },
  addresses: [AddressSchema],

  // ── Role ─────────────────────────────────────────────
  role:   { type: String, enum: ['customer', 'admin', 'delivery'], default: 'customer' },
  active: { type: Boolean, default: true },

  // ── Loyalty / Gamification (future) ──────────────────
  points:      { type: Number, default: 0 },
  referralCode:{ type: String, unique: true, sparse: true },

  // ── Metadata ─────────────────────────────────────────
  lastLoginAt: { type: Date, default: null },
  deviceTokens:[ { type: String } ],     // for push notifications

}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.password;
      delete ret.otp;
      delete ret.refreshToken;
      delete ret.__v;
      return ret;
    },
  },
});

// ─────────────────────────────────────────────────────────
// METHODS
// ─────────────────────────────────────────────────────────

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// Compare password
UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// Set hashed OTP
UserSchema.methods.setOtp = async function (code) {
  const hashed = await bcrypt.hash(code, 10);
  const expires = new Date(Date.now() + (process.env.OTP_EXPIRES_MINUTES || 10) * 60 * 1000);
  this.otp = { code: hashed, expiresAt: expires, attempts: 0, verified: false };
  await this.save();
};

// Verify OTP
UserSchema.methods.verifyOtp = async function (code) {
  if (!this.otp?.code)            return { valid: false, reason: 'No OTP found' };
  if (new Date() > this.otp.expiresAt) return { valid: false, reason: 'OTP expired' };
  if (this.otp.attempts >= 5)     return { valid: false, reason: 'Too many attempts' };

  const match = await bcrypt.compare(code, this.otp.code);

  if (!match) {
    this.otp.attempts += 1;
    await this.save();
    return { valid: false, reason: 'Invalid OTP' };
  }

  this.otp.verified        = true;
  this.isPhoneVerified     = true;
  this.otp.attempts        = 0;
  await this.save();
  return { valid: true };
};

// Virtual: full name fallback
UserSchema.virtual('displayName').get(function () {
  return this.name || `User ${this.phone.slice(-4)}`;
});

module.exports = mongoose.model('User', UserSchema);
