const mongoose = require('mongoose');

const BannerSchema = new mongoose.Schema({
  title:    { type: String, required: true },
  subtitle: { type: String, default: '' },
  emoji:    { type: String, default: '🛒' },
  gradient: { type: String, default: 'linear-gradient(135deg,#0f1c14,#1a9e5f)' },
  cta:      { type: String, default: 'Shop Now' },           // button text
  ctaLink:  { type: String, default: '' },                   // /category/groceries

  imageUrl:  { type: String, default: null },                // future: real image
  sortOrder: { type: Number, default: 0 },
  active:    { type: Boolean, default: true },

  // Schedule banners (optional, for future)
  startsAt: { type: Date, default: null },
  endsAt:   { type: Date, default: null },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Banner', BannerSchema);
