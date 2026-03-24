const router = require('express').Router();
const ctrl   = require('../controllers/cart.controller');
const { protect } = require('../middleware/auth');
const { validate, cartRules } = require('../middleware/validate');

// All cart routes require authentication
router.use(protect);

router.get   ('/',               ctrl.getCart);
router.post  ('/add',    cartRules.addItem,    validate, ctrl.addToCart);
router.post  ('/remove', cartRules.removeItem, validate, ctrl.removeFromCart);
router.put   ('/item/:productId', ctrl.updateCartItem);
router.delete('/',               ctrl.clearCart);

module.exports = router;
