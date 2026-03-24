const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────
// CART ITEM SUB-SCHEMA
// ─────────────────────────────────────────────────────────
const CartItemSchema = new mongoose.Schema({
  productId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Product',
    required: true,
  },

  // Snapshot of product at time of adding
  // (price might change — we keep what user saw)
  name:     { type: String, required: true },
  emoji:    { type: String, default: '📦' },
  unit:     { type: String, required: true },
  price:    { type: Number, required: true },   // price when added
  oldPrice: { type: Number, default: null },

  qty:      { type: Number, required: true, min: 1, default: 1 },
  total:    { type: Number, required: true },   // price × qty
}, { _id: true, timestamps: true });

// ─────────────────────────────────────────────────────────
// CART SCHEMA — one cart per user
// ─────────────────────────────────────────────────────────
const CartSchema = new mongoose.Schema({
  userId: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    unique:   true,   // one cart per user
    index:    true,
  },

  items: [CartItemSchema],

  // Computed totals (kept in sync)
  itemCount:  { type: Number, default: 0 },
  subtotal:   { type: Number, default: 0 },

  // Cart expiry (guest carts expire, logged-in carts persist)
  expiresAt: { type: Date, default: null },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

// ─────────────────────────────────────────────────────────
// METHODS
// ─────────────────────────────────────────────────────────

// Recalculate totals from items
CartSchema.methods.recalculate = function () {
  this.itemCount = this.items.reduce((sum, i) => sum + i.qty, 0);
  this.subtotal  = this.items.reduce((sum, i) => sum + i.total, 0);
  this.subtotal  = Math.round(this.subtotal * 100) / 100;
};

// Add or increment item
CartSchema.methods.addItem = function (product, qty = 1) {
  const existing = this.items.find(
    i => i.productId.toString() === product._id.toString()
  );

  if (existing) {
    existing.qty   += qty;
    existing.total  = Math.round(existing.price * existing.qty * 100) / 100;
  } else {
    this.items.push({
      productId: product._id,
      name:      product.name,
      emoji:     product.emoji,
      unit:      product.unit,
      price:     product.price,
      oldPrice:  product.oldPrice || null,
      qty,
      total:     Math.round(product.price * qty * 100) / 100,
    });
  }

  this.recalculate();
};

// Remove or decrement item
CartSchema.methods.removeItem = function (productId, qty = 1) {
  const idx = this.items.findIndex(
    i => i.productId.toString() === productId.toString()
  );

  if (idx === -1) return;

  if (this.items[idx].qty <= qty) {
    this.items.splice(idx, 1);
  } else {
    this.items[idx].qty   -= qty;
    this.items[idx].total  = Math.round(this.items[idx].price * this.items[idx].qty * 100) / 100;
  }

  this.recalculate();
};

// Clear all items
CartSchema.methods.clearItems = function () {
  this.items     = [];
  this.itemCount = 0;
  this.subtotal  = 0;
};

module.exports = mongoose.model('Cart', CartSchema);
