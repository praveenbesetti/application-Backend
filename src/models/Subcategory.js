const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────
// SUBCATEGORY — separate collection
// Referenced by Product via ObjectId
// ─────────────────────────────────────────────────────────
const SubcategorySchema = new mongoose.Schema({
  // Slug for URLs:  /category/vegetables?subcat=leafy
  slug:       { type: String, required: true, trim: true, index: true },
  name:       { type: String, required: true, trim: true },
  emoji:      { type: String, default: '📦' },
  imageUrl:   { type: String, default: null },

  // Parent category reference
  categoryId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
    index:    true,
  },

  // Keep slug for easy querying without populate
  categorySlug: { type: String, required: true, index: true },

  sortOrder:  { type: Number, default: 0 },
  active:     { type: Boolean, default: true },
  featured:   { type: Boolean, default: false },
}, {
  timestamps: true,
});

// Compound index: fast lookup by category + slug
SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });
SubcategorySchema.index({ categorySlug: 1, active: 1 });

module.exports = mongoose.model('Subcategory', SubcategorySchema);
