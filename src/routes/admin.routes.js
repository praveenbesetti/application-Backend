const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const ctrl    = require('../controllers/admin.controller');

// CSV upload middleware
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files allowed'));
    }
    cb(null, true);
  },
});

// ── Dashboard ──────────────────────────────────────────────
router.get('/stats', ctrl.getStats);

// ── Products ───────────────────────────────────────────────
router.post  ('/products/csv',         upload.single('file'), ctrl.uploadProductsCSV);
router.get   ('/products',             ctrl.listProducts);
router.post  ('/products',             ctrl.createProduct);
router.put   ('/products/:id',         ctrl.updateProduct);
router.delete('/products/:id',         ctrl.deleteProduct);
router.patch ('/products/:id/stock',   ctrl.updateStock);   // PATCH for stock only

// ── Categories ─────────────────────────────────────────────
router.post('/categories/csv',         upload.single('file'), ctrl.uploadCategoriesCSV);
router.post('/categories',             ctrl.createCategory);
router.put ('/categories/:slug',       ctrl.updateCategory);

// ── Subcategories ──────────────────────────────────────────
router.post('/subcategories/csv',      upload.single('file'), ctrl.uploadSubcategoriesCSV);

// ── Banners ────────────────────────────────────────────────
router.get   ('/banners',              ctrl.listBanners);
router.post  ('/banners',              ctrl.createBanner);
router.put   ('/banners/:id',          ctrl.updateBanner);
router.delete('/banners/:id',          ctrl.deleteBanner);

module.exports = router;
