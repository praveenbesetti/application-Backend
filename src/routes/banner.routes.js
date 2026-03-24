const router = require('express').Router();
const { getAll } = require('../controllers/banner.controller');

router.get('/', getAll);  // GET /api/banners

module.exports = router;
