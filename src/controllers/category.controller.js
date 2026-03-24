const Category    = require('../models/Category');
const Subcategory = require('../models/Subcategory');

// GET /api/categories
// Returns all active categories with their subcategories
const getAll = async (req, res, next) => {
  try {
    const categories = await Category
      .find({ active: true })
      .sort({ sortOrder: 1 })
      .select('-__v')
      .populate({
        path:    'subcategories',
        select:  'slug name emoji imageUrl sortOrder title',
        options: { sort: { sortOrder: 1 } },
        match:   { active: true },
      });

    res.json({ success: true, count: categories.length, data: categories });
  } catch (err) {
    next(err);
  }
};

// GET /api/categories/:slug
const getOne = async (req, res, next) => {
  try {
    const category = await Category
      .findOne({ slug: req.params.slug, active: true })
      .select('-__v')
      .populate({
        path:    'subcategories',
        select:  'slug name emoji sortOrder imageUrl',
        options: { sort: { sortOrder: 1 } },
        match:   { active: true },
      });

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json({ success: true, data: category });
  } catch (err) {
    next(err);
  }
};

// GET /api/categories/:slug/subcategories
const getSubcategories = async (req, res, next) => {
  try {
    const category = await Category.findOne({ slug: req.params.slug, active: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const subcategories = await Subcategory
      .find({ categoryId: category._id, active: true })
      .sort({ sortOrder: 1 })
      .select('-__v -categoryId');

    res.json({ success: true, count: subcategories.length, data: subcategories });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getOne, getSubcategories };
