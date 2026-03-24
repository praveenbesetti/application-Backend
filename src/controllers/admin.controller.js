const { parse } = require('csv-parse/sync');
const fs          = require('fs');
const Product     = require('../models/Product');
const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');
const Banner      = require('../models/Banner');

// ── Validate admin secret ─────────────────────────────────
const checkSecret = (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────
// PRODUCTS CSV UPLOAD
// CSV: name,unit,price,oldPrice,emoji,badge,categorySlug,subcategorySlug,stock,featured,active,tags
// ─────────────────────────────────────────────────────────
const uploadProductsCSV = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded' });

    const rows = parse(fs.readFileSync(req.file.path, 'utf8'), {
      columns: true, skip_empty_lines: true, trim: true,
    });

    if (!rows.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'CSV is empty' });
    }

    // Pre-fetch all categories and subcategories for slug→ObjectId mapping
    const [cats, subs] = await Promise.all([
      Category.find({ active: true }).select('_id slug'),
      Subcategory.find({ active: true }).select('_id slug categorySlug'),
    ]);

    const catMap = {};
    cats.forEach(c => { catMap[c.slug] = c._id; });

    const subMap = {};
    subs.forEach(s => { subMap[`${s.categorySlug}:${s.slug}`] = s._id; });

    const required = ['name', 'unit', 'price', 'categorySlug', 'subcategorySlug'];
    const errors   = [];
    const products = [];

    rows.forEach((row, i) => {
      const missing = required.filter(f => !row[f]);
      if (missing.length) {
        errors.push(`Row ${i + 2}: missing ${missing.join(', ')}`);
        return;
      }

      const catId = catMap[row.categorySlug];
      const subId = subMap[`${row.categorySlug}:${row.subcategorySlug}`];

      if (!catId) {
        errors.push(`Row ${i + 2}: category "${row.categorySlug}" not found`);
        return;
      }
      if (!subId) {
        errors.push(`Row ${i + 2}: subcategory "${row.subcategorySlug}" not found in "${row.categorySlug}"`);
        return;
      }

      products.push({
        name:            row.name.trim(),
        unit:            row.unit.trim(),
        price:           parseFloat(row.price),
        oldPrice:        row.oldPrice ? parseFloat(row.oldPrice) : null,
        emoji:           row.emoji || '📦',
        imageUrl:        row.imageUrl || null,
        badge:           row.badge || null,
        categoryId:      catId,
        categorySlug:    row.categorySlug.trim(),
        subcategoryId:   subId,
        subcategorySlug: row.subcategorySlug.trim(),
        stock:           row.stock ? parseInt(row.stock) : 999,
        featured:        row.featured === 'true',
        active:          row.active !== 'false',
        tags:            row.tags ? row.tags.split('|').map(t => t.trim()) : [],
        inStock:         true,
      });
    });

    if (errors.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'Validation errors', errors });
    }

    // Upsert: update if same name+categorySlug exists, else insert
    const ops = products.map(p => ({
      updateOne: {
        filter: { name: p.name, categorySlug: p.categorySlug },
        update: { $set: p },
        upsert: true,
      },
    }));

    const result = await Product.bulkWrite(ops);
    fs.unlinkSync(req.file.path);

    res.json({
      success:  true,
      message:  `Processed ${products.length} products`,
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// CATEGORIES CSV UPLOAD
// CSV: slug,name,emoji,color,bg,sub,sortOrder,featured,active
// ─────────────────────────────────────────────────────────
const uploadCategoriesCSV = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file' });

    const rows = parse(fs.readFileSync(req.file.path, 'utf8'), {
      columns: true, skip_empty_lines: true, trim: true,
    });

    const ops = rows.map(row => ({
      updateOne: {
        filter: { slug: row.slug.trim().toLowerCase() },
        update: {
          $set: {
            title:     row.title || " ",
            slug:      row.slug.trim().toLowerCase(),
            name:      row.name.trim(),
            emoji:     row.emoji || '📦',
            imageUrl:  row.imageUrl || null,
            color:     row.color || '#16a05a',
            bg:        row.bg || '#e8f8ef',
            sub:       row.sub || '',
            sortOrder: row.sortOrder ? parseInt(row.sortOrder) : 0,
            featured:  row.featured === 'true',
            active:    row.active !== 'false',
          },
        },
        upsert: true,
      },
    }));

    const result = await Category.bulkWrite(ops);
    fs.unlinkSync(req.file.path);

    res.json({
      success:  true,
      message:  `Processed ${rows.length} categories`,
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// SUBCATEGORIES CSV UPLOAD
// CSV: slug,name,emoji,categorySlug,sortOrder,featured,active
// ─────────────────────────────────────────────────────────
const uploadSubcategoriesCSV = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file' });

    const rows = parse(fs.readFileSync(req.file.path, 'utf8'), {
      columns: true, skip_empty_lines: true, trim: true,
    });

    // Build category slug → ObjectId map
    const cats   = await Category.find({ active: true }).select('_id slug');
    const catMap = {};
    cats.forEach(c => { catMap[c.slug] = c._id; });

    const errors = [];
    const ops    = [];

    rows.forEach((row, i) => {
      const catId = catMap[row.categorySlug];
      if (!catId) {
        errors.push(`Row ${i + 2}: category "${row.categorySlug}" not found`);
        return;
      }
      ops.push({
        updateOne: {
          filter: { slug: row.slug.trim(), categoryId: catId },
          update: {
            $set: {
              slug:         row.slug.trim(),
              name:         row.name.trim(),
              emoji:        row.emoji || '📦',
              imageUrl:     row.imageUrl || null,
              categoryId:   catId,
              categorySlug: row.categorySlug.trim(),
              sortOrder:    row.sortOrder ? parseInt(row.sortOrder) : 0,
              featured:     row.featured === 'true',
              active:       row.active !== 'false',
            },
          },
          upsert: true,
        },
      });
    });

    if (errors.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, errors });
    }

    const result = await Subcategory.bulkWrite(ops);
    fs.unlinkSync(req.file.path);

    res.json({
      success:  true,
      message:  `Processed ${ops.length} subcategories`,
      inserted: result.upsertedCount,
      updated:  result.modifiedCount,
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// PRODUCT CRUD
// ─────────────────────────────────────────────────────────
const listProducts = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const { category, page = 1, limit = 50, search } = req.query;
    const filter = {};
    if (category) filter.categorySlug = category;
    if (search)   filter.$text = { $search: search };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ categorySlug: 1, sortOrder: 1 }).skip(skip).limit(parseInt(limit)).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ success: true, total, page: parseInt(page), data: products });
  } catch (err) { next(err); }
};

const createProduct = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    // Resolve slugs to ObjectIds if provided
    if (req.body.categorySlug && !req.body.categoryId) {
      const cat = await Category.findOne({ slug: req.body.categorySlug });
      if (cat) req.body.categoryId = cat._id;
    }
    if (req.body.subcategorySlug && !req.body.subcategoryId) {
      const sub = await Subcategory.findOne({ slug: req.body.subcategorySlug });
      if (sub) req.body.subcategoryId = sub._id;
    }
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) { next(err); }
};

const updateProduct = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id, { $set: req.body }, { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

const deleteProduct = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    await Product.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ success: true, message: 'Product deactivated' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// CATEGORY CRUD
// ─────────────────────────────────────────────────────────
const createCategory = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const cat = await Category.create(req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (err) { next(err); }
};

const updateCategory = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const cat = await Category.findOneAndUpdate(
      { slug: req.params.slug }, { $set: req.body }, { new: true }
    );
    if (!cat) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: cat });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────────────────
const listBanners  = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const banners = await Banner.find().sort({ sortOrder: 1 });
    res.json({ success: true, data: banners });
  } catch (err) { next(err); }
};
const createBanner = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, data: banner });
  } catch (err) { next(err); }
};
const updateBanner = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    if (!banner) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: banner });
  } catch (err) { next(err); }
};
const deleteBanner = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    await Banner.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Banner deleted' });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────
const getStats = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const [totalProducts, totalCategories, totalSubcategories, totalBanners, outOfStock, productsByCategory] = await Promise.all([
      Product.countDocuments({ active: true }),
      Category.countDocuments({ active: true }),
      Subcategory.countDocuments({ active: true }),
      Banner.countDocuments({ active: true }),
      Product.countDocuments({ active: true, inStock: false }),
      Product.aggregate([
        { $match: { active: true } },
        { $group: { _id: '$categorySlug', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      data: {
        totalProducts, totalCategories, totalSubcategories,
        totalBanners, outOfStock, productsByCategory,
      },
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────
// STOCK UPDATE
// ─────────────────────────────────────────────────────────
const updateStock = async (req, res, next) => {
  if (!checkSecret(req, res)) return;
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ success: false, message: 'Invalid stock value' });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { stock, inStock: stock > 0 } },
      { new: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: product });
  } catch (err) { next(err); }
};

module.exports = {
  uploadProductsCSV, uploadCategoriesCSV, uploadSubcategoriesCSV,
  listProducts, createProduct, updateProduct, deleteProduct,
  createCategory, updateCategory,
  listBanners, createBanner, updateBanner, deleteBanner,
  getStats, updateStock,
};