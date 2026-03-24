const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────
// PRODUCT — handles massive scale
// ObjectId refs to Category + Subcategory
// Slug kept for URL friendliness
// ─────────────────────────────────────────────────────────
const ProductSchema = new mongoose.Schema({

  // ── Identity ─────────────────────────────────────────
  name:  { type: String, required: true, trim: true },
  slug:  { type: String, trim: true, index: true },

  // ── Category refs (ObjectId for DB + slug for URLs) ──
  categoryId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Category',
    required: true,
    index:    true,
  },
  categorySlug: { type: String, required: true, index: true }, // kept for fast slug queries

  subcategoryId: {
    type:  mongoose.Schema.Types.ObjectId,
    ref:   'Subcategory',
    index: true,
  },
  subcategorySlug: { type: String, index: true }, // kept for fast slug queries

  // ── Display ───────────────────────────────────────────
  emoji:    { type: String, default: '📦' },
  imageUrl: { type: String, default: null },
  badge:    { type: String, default: null },

  // ── Pricing ───────────────────────────────────────────
  price:    { type: Number, required: true, min: 0, index: true },
  oldPrice: { type: Number, default: null },
  unit:     { type: String, required: true },     // '500g', '1 L', '1 pc'

  // ── Inventory ─────────────────────────────────────────
  // For small scale: stock count stored here in MongoDB
  // For massive scale: stockId points to PostgreSQL stock table
  stock:    { type: Number, default: 999 },       // available units
  reserved: { type: Number, default: 0  },        // held in pending carts/orders
  stockId:  { type: String, default: null },      // future: PG stock table reference
  inStock:  { type: Boolean, default: true, index: true },

  // ── Flexible attributes (different per category) ──────
  // Electronics: { ram:'6GB', storage:'128GB', battery:'5000mAh' }
  // Vegetables:  { organic:true, freshDays:3 }
  // Legal:       { turnaround:'2 days' }
  attributes: { type: mongoose.Schema.Types.Mixed, default: {} },

  // ── Metadata ──────────────────────────────────────────
  sortOrder:  { type: Number, default: 0 },
  active:     { type: Boolean, default: true, index: true },
  featured:   { type: Boolean, default: false },
  tags:       [{ type: String, index: true }],

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// ─────────────────────────────────────────────────────────
// INDEXES — critical for massive product queries
// ─────────────────────────────────────────────────────────
ProductSchema.index({ categoryId: 1, inStock: 1, price: 1 });
ProductSchema.index({ categoryId: 1, subcategoryId: 1, active: 1 });
ProductSchema.index({ categorySlug: 1, subcategorySlug: 1 });
ProductSchema.index({ featured: 1, categoryId: 1 });
ProductSchema.index({ price: 1, active: 1 });
ProductSchema.index({ name: 'text', tags: 'text' }); // full-text search

// ─────────────────────────────────────────────────────────
// VIRTUALS
// ─────────────────────────────────────────────────────────
ProductSchema.virtual('discountPct').get(function () {
  if (!this.oldPrice || this.oldPrice <= this.price) return 0;
  return Math.round(((this.oldPrice - this.price) / this.oldPrice) * 100);
});

// Available units = stock - reserved
ProductSchema.virtual('availableStock').get(function () {
  return Math.max(0, this.stock - this.reserved);
});

// Stock status label
ProductSchema.virtual('stockStatus').get(function () {
  const available = this.stock - this.reserved;
  if (available <= 0)  return 'OUT_OF_STOCK';
  if (available <= 5)  return 'VERY_LOW';
  if (available <= 20) return 'LOW';
  return 'IN_STOCK';
});

// ─────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────

// Auto-generate slug from name
ProductSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  // Auto-update inStock flag
  this.inStock = (this.stock - this.reserved) > 0;
  next();
});

// Keep inStock in sync on update
ProductSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.$set?.stock !== undefined || update.$set?.reserved !== undefined) {
    const stock    = update.$set.stock    ?? this._update?.$set?.stock;
    const reserved = update.$set.reserved ?? 0;
    if (stock !== undefined) {
      update.$set.inStock = (stock - reserved) > 0;
    }
  }
  next();
});

module.exports = mongoose.model('Product', ProductSchema);
