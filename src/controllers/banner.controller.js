const Banner = require('../models/Banner');

// GET /api/banners — returns all active banners sorted by sortOrder
const getAll = async (req, res, next) => {
  try {
    const now = new Date();

    const banners = await Banner.find({
      active: true,
      $or: [
        { startsAt: null },
        { startsAt: { $lte: now } },
      ],
      $or: [
        { endsAt: null },
        { endsAt: { $gte: now } },
      ],
    })
    .sort({ sortOrder: 1 })
    .select('-__v -createdAt -updatedAt');

    res.json({ success: true, count: banners.length, data: banners });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll };
