const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');
const { protect, requirePermission } = require('../middleware/auth');

router.get('/', getCategories);
router.post('/', protect, requirePermission('canManageCategories'), createCategory);
router.put('/:id', protect, requirePermission('canManageCategories'), updateCategory);
router.delete('/:id', protect, requirePermission('canManageCategories'), deleteCategory);

module.exports = router;
