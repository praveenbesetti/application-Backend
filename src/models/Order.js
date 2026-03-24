const mongoose = require('mongoose');

// Ready for Phase 2 — not used yet
const OrderItemSchema = new mongoose.Schema({
  productId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  name:        { type: String },          // snapshot at order time
  emoji:       { type: String },
  unit:        { type: String },
  price:       { type: Number },          // price at order time (immutable)
  qty:         { type: Number, min: 1 },
  total:       { type: Number },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  items:       [OrderItemSchema],

  subtotal:    { type: Number },
  deliveryFee: { type: Number, default: 0 },
  discount:    { type: Number, default: 0 },
  total:       { type: Number },

  address: {
    line1:   String,
    city:    String,
    pincode: String,
    lat:     Number,
    lng:     Number,
  },

  status: {
    type: String,
    enum: ['pending', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
    index: true,
  },

  payment: {
    method:    { type: String, enum: ['cod', 'razorpay', 'upi'], default: 'cod' },
    status:    { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    razorpayOrderId:   { type: String },
    razorpayPaymentId: { type: String },
    paidAt:    { type: Date },
  },

  estimatedDelivery: { type: Date },
  deliveredAt:       { type: Date },
  cancelReason:      { type: String },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Order', OrderSchema);
