const express = require('express');
const router = express.Router();
const {
  createPost,
  getPublicPosts,
  getPostById,
  getUserPosts,
  joinPost,
  updatePostStatus,
  toggleFeaturedPost,
  deletePost,
} = require('../controllers/postController');
const { protect, optionalAuth } = require('../middleware/auth');

router.route('/')
  .get(optionalAuth, getPublicPosts)
  .post(protect, createPost);

router.get('/user/my-posts', protect, getUserPosts);
router.get('/:id', optionalAuth, getPostById);
router.post('/:id/join', protect, joinPost);
router.put('/:id/status', protect, updatePostStatus);
router.put('/:id/feature', protect, toggleFeaturedPost);
router.delete('/:id', protect, deletePost);

module.exports = router;
