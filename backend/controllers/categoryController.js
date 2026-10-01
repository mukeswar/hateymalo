const Category = require('../models/Category');
const Post = require('../models/Post');

// Default categories list matching USER_REQUEST requirements
const DEFAULT_CATEGORIES = [
  { name: 'Help Request', description: 'Urgent personal or community aid requests', icon: 'HeartHandshake' },
  { name: 'Education Support', description: 'Tutoring, book donations, study groups', icon: 'BookOpen' },
  { name: 'Assignment Guidance', description: 'Academic and homework help', icon: 'GraduationCap' },
  { name: 'Writing Support', description: 'Resume writing, translation, essay guidance', icon: 'FileText' },
  { name: 'Cleaning Campaign', description: 'Neighborhood and environment cleaning drives', icon: 'Sparkles' },
  { name: 'Street Cleaning', description: 'Dedicated street and riverbank cleanups', icon: 'Trash2' },
  { name: 'Tree Plantation', description: 'Aforestation and green community initiatives', icon: 'Trees' },
  { name: 'Social Help', description: 'Disaster relief, food drives, blood donation', icon: 'Users' },
  { name: 'Community Activity', description: 'Local sports, cultural events, youth clubs', icon: 'Smile' },
  { name: 'Awareness Campaign', description: 'Health, safety, and civic awareness programs', icon: 'Megaphone' },
  { name: 'Project Collaboration', description: 'Open source, local projects, startup help', icon: 'Briefcase' },
  { name: 'Other', description: 'Miscellaneous help and collaboration requests', icon: 'MoreHorizontal' },
];

// @desc    Get all categories with post counts
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const filter = (activeOnly === 'true' || activeOnly === '1') ? { isActive: { $ne: false } } : {};
    let categories = await Category.find(filter).sort({ name: 1 });

    // Seed defaults if the collection is completely empty (only when unfiltered).
    if (categories.length === 0 && !activeOnly) {
      await Category.insertMany(
        DEFAULT_CATEGORIES.map((c) => ({
          ...c,
          slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        }))
      );
      categories = await Category.find().sort({ name: 1 });
    }

    // Attach count of approved posts per category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const postCount = await Post.countDocuments({
          category: cat.name,
          status: 'APPROVED',
        });
        return {
          ...cat.toObject(),
          postCount,
        };
      })
    );

    res.json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const { name, description, icon, isActive } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      description,
      icon,
      isActive: typeof isActive === 'boolean' ? isActive : true,
    });
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const { name, description, icon, isActive } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon) category.icon = icon;
    if (typeof isActive === 'boolean') category.isActive = isActive;

    await category.save();
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  DEFAULT_CATEGORIES,
};
