const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getPendingPosts,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getPendingBlogs,
  verifyMember,
  toggleUserSuspension,
  getAllCommentsAdmin,
  deleteCommentAdmin,
  getAllDonationsAdmin,
  getAllExpensesAdmin,
  deleteExpenseAdmin,
  updateCampaignAdmin,
  deleteCampaignAdmin,
  createOrganizationAdmin,
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/stats', getDashboardStats);
router.get('/pending-posts', getPendingPosts);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/verify', verifyMember);
router.put('/users/:id/suspend', toggleUserSuspension);
router.delete('/users/:id', deleteUser);
router.get('/pending-blogs', getPendingBlogs);

router.post('/organizations', createOrganizationAdmin);

router.get('/comments', getAllCommentsAdmin);
router.delete('/comments/:id', deleteCommentAdmin);

router.get('/donations', getAllDonationsAdmin);
router.get('/expenses', getAllExpensesAdmin);
router.delete('/expenses/:id', deleteExpenseAdmin);

router.put('/campaigns/:id', updateCampaignAdmin);
router.delete('/campaigns/:id', deleteCampaignAdmin);

module.exports = router;
