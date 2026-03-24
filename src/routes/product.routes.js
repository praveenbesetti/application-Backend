const router = require('express').Router();
const { getAll, search, getFeatured, getOne, getRelated } = require('../controllers/product.controller');

router.get('/search',           search);       // GET /api/products/search?q=tomato
router.get('/featured',         getFeatured);  // GET /api/products/featured
router.get('/',                 getAll);        // GET /api/products?category=groceries&subcat=atta
router.get('/:id',              getOne);        // GET /api/products/:id
router.get('/:id/related',      getRelated);   // GET /api/products/:id/related

module.exports = router;
