const express = require('express');
const router = express.Router();
const {
  toggleInterest,
  getInterestedUsers,
  createComment,
  getPostComments,
  editComment,
  deleteComment,
  reportComment,
  createPostUpdate,
  getPostUpdates,
} = require('../controllers/interactionController');
const { protect } = require('../middleware/auth');

// Interest routes
router.post('/posts/:id/interest', protect, toggleInterest);
router.get('/posts/:id/interested-users', getInterestedUsers);

// Comments routes
router.route('/posts/:id/comments')
  .get(getPostComments)
  .post(protect, createComment);

router.route('/comments/:commentId')
  .put(protect, editComment)
  .delete(protect, deleteComment);

router.post('/comments/:commentId/report', protect, reportComment);

// Post updates routes
router.route('/posts/:id/updates')
  .get(getPostUpdates)
  .post(protect, createPostUpdate);

module.exports = router;
