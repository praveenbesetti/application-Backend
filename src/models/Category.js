const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────
// CATEGORY — top level only
// Subcategories are now a SEPARATE collection (Subcategory.js)
// ─────────────────────────────────────────────────────────
const CategorySchema = new mongoose.Schema({
  title:      {type:String, default:''},
  slug:      { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  name:      { type: String, required: true, trim: true },
  emoji:     { type: String, default: '📦' },
  color:     { type: String, default: '#16a05a' },
  bg:        { type: String, default: '#e8f8ef' },
  sub:       { type: String, default: '' },         // subtitle shown on card
  imageUrl:  { type: String, default: null },        // future: real banner image
  sortOrder: { type: Number, default: 0, index: true },
  active:    { type: Boolean, default: true, index: true },
  featured:  { type: Boolean, default: false },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// Virtual: get subcategories (populated when needed)
// Usage: Category.findOne().populate('subcategories')
CategorySchema.virtual('subcategories', {
  ref:          'Subcategory',
  localField:   '_id',
  foreignField: 'categoryId',
  options:      { sort: { sortOrder: 1 }, match: { active: true } },
});

module.exports = mongoose.model('Category', CategorySchema);
