const router = require('express').Router();
const { getAll, getOne, getSubcategories } = require('../controllers/category.controller');

router.get('/',                        getAll);            // GET /api/categories
router.get('/:slug',                   getOne);            // GET /api/categories/groceries
router.get('/:slug/subcategories',     getSubcategories);  // GET /api/categories/groceries/subcategories

module.exports = router;
