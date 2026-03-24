const Cart    = require('../models/Cart');
const Product = require('../models/Product');

// ─────────────────────────────────────────────────────────
// Helper: get or create cart for user
// ─────────────────────────────────────────────────────────
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = new Cart({ userId, items: [] });
    await cart.save();
  }
  return cart;
};

// ─────────────────────────────────────────────────────────
// GET /api/cart
// Get current user's cart
// ─────────────────────────────────────────────────────────
const getCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate('items.productId', 'name emoji unit price oldPrice inStock stock');

    if (!cart) {
      return res.json({ success: true, data: { items: [], itemCount: 0, subtotal: 0 } });
    }

    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/cart/add
// Body: { productId, qty? }
// Add item to cart — checks stock before adding
// ─────────────────────────────────────────────────────────
const addToCart = async (req, res, next) => {
  try {
    const { productId, qty = 1 } = req.body;

    // Fetch product and check stock
    const product = await Product.findOne({ _id: productId, active: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const available = product.stock - product.reserved;
    if (available <= 0) {
      return res.status(400).json({
        success:     false,
        message:     'Product is out of stock',
        stockStatus: 'OUT_OF_STOCK',
      });
    }
    if (qty > available) {
      return res.status(400).json({
        success:     false,
        message:     `Only ${available} unit(s) available`,
        stockStatus: available <= 5 ? 'VERY_LOW' : 'LOW',
        available,
      });
    }

    // Get or create cart
    const cart = await getOrCreateCart(req.user._id);

    // Check if already in cart — don't exceed stock
    const existingItem = cart.items.find(
      i => i.productId.toString() === productId
    );
    const currentCartQty = existingItem?.qty || 0;

    if (currentCartQty + qty > available) {
      return res.status(400).json({
        success:  false,
        message:  `Cannot add more. Only ${available} available and you already have ${currentCartQty} in cart.`,
        available,
      });
    }

    // Add to cart
    cart.addItem(product, qty);
    await cart.save();

    res.json({
      success:  true,
      message:  'Added to cart',
      data:     cart,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/cart/remove
// Body: { productId, qty? }
// ─────────────────────────────────────────────────────────
const removeFromCart = async (req, res, next) => {
  try {
    const { productId, qty = 1 } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    cart.removeItem(productId, qty);
    await cart.save();

    res.json({ success: true, message: 'Item removed', data: cart });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// PUT /api/cart/item/:productId
// Body: { qty }
// Set exact quantity for an item
// ─────────────────────────────────────────────────────────
const updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { qty }       = req.body;

    if (!qty || qty < 0) {
      return res.status(400).json({ success: false, message: 'Invalid quantity' });
    }

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found' });
    }

    // If qty is 0 — remove item
    if (qty === 0) {
      cart.removeItem(productId, 999);
      await cart.save();
      return res.json({ success: true, message: 'Item removed', data: cart });
    }

    // Check stock
    const product  = await Product.findById(productId);
    const available = product.stock - product.reserved;

    if (qty > available) {
      return res.status(400).json({
        success:  false,
        message:  `Only ${available} unit(s) available`,
        available,
      });
    }

    // Update qty
    const item = cart.items.find(i => i.productId.toString() === productId);
    if (item) {
      item.qty   = qty;
      item.total = Math.round(item.price * qty * 100) / 100;
      cart.recalculate();
      await cart.save();
    }

    res.json({ success: true, data: cart });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/cart
// Clear entire cart
// ─────────────────────────────────────────────────────────
const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (cart) {
      cart.clearItems();
      await cart.save();
    }
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, addToCart, removeFromCart, updateCartItem, clearCart };
