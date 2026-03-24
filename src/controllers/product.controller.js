const Product     = require('../models/Product');
const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// ─────────────────────────────────────────────────────────
// Helper: build sort object
// ─────────────────────────────────────────────────────────
const buildSort = (sortBy) => {
  switch (sortBy) {
    case 'price_asc':  return { price: 1 };
    case 'price_desc': return { price: -1 };
    case 'name':       return { name: 1 };
    case 'newest':     return { createdAt: -1 };
    case 'discount':   return { oldPrice: -1, price: 1 };
    default:           return { sortOrder: 1, featured: -1, createdAt: -1 };
  }
};

// ─────────────────────────────────────────────────────────
// Helper: resolve category/subcat slugs → ObjectIds
// This allows frontend to query by slug while DB uses ObjectId
// ─────────────────────────────────────────────────────────
const resolveIds = async (categorySlug, subcatSlug) => {
  const ids = {};

  if (categorySlug) {
    // First try direct slug index (fast)
    const cat = await Category.findOne({ slug: categorySlug, active: true }).select('_id');
    if (cat) ids.categoryId = cat._id;
    else ids.categorySlug = categorySlug; // fallback to slug field
  }

  if (subcatSlug && subcatSlug !== 'all') {
    const sub = await Subcategory.findOne({ slug: subcatSlug, active: true }).select('_id');
    if (sub) ids.subcategoryId = sub._id;
    else ids.subcategorySlug = subcatSlug; // fallback to slug field
  }

  return ids;
};

// ─────────────────────────────────────────────────────────
// GET /api/products
// Supports: category, subcat, sort, search,
//           minPrice, maxPrice, onSale, page, limit
// Handles massive product lists via pagination + indexes
// ─────────────────────────────────────────────────────────
const getAll = async (req, res, next) => {
  try {
    const {
      category, subcat,
      sort = 'relevance',
      search,
      minPrice, maxPrice,
      onSale,
      page  = 1,
      limit = 20,
    } = req.query;

    // Base filter
    const filter = { active: true };

    // Resolve slugs to ObjectIds for indexed queries
    if (category || subcat) {
      const ids = await resolveIds(category, subcat);
      Object.assign(filter, ids);
    }

    // Price range
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // On sale only (has oldPrice)
    if (onSale === 'true') {
      filter.oldPrice = { $ne: null, $exists: true };
    }

    // Full-text search (uses text index)
    if (search && search.trim().length >= 2) {
      filter.$text = { $search: search.trim() };
    }

    // Pagination
    const pageNum  = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip     = (pageNum - 1) * limitNum;

    // Execute query + count in parallel
    const sortObj = buildSort(sort);
    if (search) sortObj.score = { $meta: 'textScore' }; // text score sort

    const [products, total] = await Promise.all([
      Product
        .find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .select('-__v -attributes')
        .lean(), // lean() returns plain JS objects — much faster for reads
      Product.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page:    pageNum,
      pages:   Math.ceil(total / limitNum),
      count:   products.length,
      data:    products,
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/products/search?q=term
// Full-text search across name + tags
// ─────────────────────────────────────────────────────────
const search = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Search term too short (min 2 chars)' });
    }

    const products = await Product
      .find({
        active: true,
        $text:  { $search: q.trim() },
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(Math.min(50, parseInt(limit)))
      .select('name emoji imageUrl unit price oldPrice badge categorySlug subcategorySlug inStock stockStatus')
      .lean();

    res.json({ success: true, count: products.length, data: products });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/products/featured
// Home page: top featured products per category
// Uses aggregation for massive datasets
// ─────────────────────────────────────────────────────────
const getFeatured = async (req, res, next) => {
  try {
    const perCategory = parseInt(req.query.limit) || 8;

    const products = await Product.aggregate([
      { $match: { active: true, featured: true, inStock: true } },
      { $sort:  { sortOrder: 1, createdAt: -1 } },
      {
        $group: {
          _id:      '$categoryId',
          slug:     { $first: '$categorySlug' },
          products: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          categorySlug: '$slug',
          products:     { $slice: ['$products', perCategory] },
        },
      },
      { $sort: { categorySlug: 1 } },
    ]);

    // Transform to { categorySlug: products[] } map
    const byCategory = {};
    products.forEach(({ categorySlug, products: prods }) => {
      byCategory[categorySlug] = prods;
    });

    res.json({ success: true, data: products, byCategory });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/products/:id
// Single product with populate
// ─────────────────────────────────────────────────────────
const getOne = async (req, res, next) => {
  try {
    const product = await Product
      .findOne({ _id: req.params.id, active: true })
      .populate('categoryId',    'name slug emoji imageUrl color bg')
      .populate('subcategoryId', 'name slug emoji imageUrl')
      .select('-__v');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/products/:id/related
// Related products from same subcategory, excluding current
// ─────────────────────────────────────────────────────────
const getRelated = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).select('categoryId subcategoryId');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const related = await Product
      .find({
        _id:           { $ne: product._id },
        subcategoryId: product.subcategoryId,
        active:        true,
        inStock:       true,
      })
      .sort({ featured: -1, sortOrder: 1 })
      .limit(10)
      .select('name emoji imageUrl unit price oldPrice badge categorySlug subcategorySlug inStock')
      .lean();

    // If not enough from same subcat, fill from same category
    if (related.length < 5) {
      const extra = await Product
        .find({
          _id:        { $ne: product._id, $nin: related.map(p => p._id) },
          categoryId: product.categoryId,
          active:     true,
          inStock:    true,
        })
        .sort({ featured: -1, sortOrder: 1 })
        .limit(10 - related.length)
        .select('name emoji imageUrl unit price oldPrice badge categorySlug subcategorySlug inStock')
        .lean();

      related.push(...extra);
    }

    res.json({ success: true, count: related.length, data: related });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, search, getFeatured, getOne, getRelated };
