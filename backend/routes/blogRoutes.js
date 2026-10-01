const express = require('express');
const router = express.Router();
const {
  createBlog,
  getPublicBlogs,
  getBlogById,
  toggleBlogReaction,
  updateBlogStatus,
  toggleFeaturedBlog,
  deleteBlog,
} = require('../controllers/blogController');
const { protect, adminOnly } = require('../middleware/auth');

router.route('/')
  .get(getPublicBlogs)
  .post(protect, createBlog);

router.get('/:id', getBlogById);
router.post('/:id/react', protect, toggleBlogReaction);
router.put('/:id/status', protect, adminOnly, updateBlogStatus);
router.put('/:id/feature', protect, adminOnly, toggleFeaturedBlog);
router.delete('/:id', protect, deleteBlog);

module.exports = router;
