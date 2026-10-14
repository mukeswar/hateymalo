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
const { protect, adminOnly, superAdminOnly, requirePermission } = require('../middleware/auth');

// Every route needs a staff account; each action then needs its own permission.
router.use(protect, adminOnly);

router.get('/stats', getDashboardStats); // finance figures are hidden without canViewDonations
router.get('/pending-posts', requirePermission('canApprovePosts'), getPendingPosts);
router.get('/pending-blogs', requirePermission('canApprovePosts'), getPendingBlogs);

router.get('/users', requirePermission('canManageUsers'), getAllUsers);
router.put('/users/:id/role', superAdminOnly, updateUserRole);
router.put('/users/:id/verify', requirePermission('canManageUsers'), verifyMember);
router.put('/users/:id/suspend', requirePermission('canManageUsers'), toggleUserSuspension);
router.delete('/users/:id', requirePermission('canDeleteUsers'), deleteUser);

router.post('/organizations', requirePermission('canManageOrganizations'), createOrganizationAdmin);

router.get('/comments', requirePermission('canDeletePosts'), getAllCommentsAdmin);
router.delete('/comments/:id', requirePermission('canDeletePosts'), deleteCommentAdmin);

router.get('/donations', requirePermission('canViewDonations'), getAllDonationsAdmin);
router.get('/expenses', requirePermission('canViewDonations'), getAllExpensesAdmin);
router.delete('/expenses/:id', requirePermission('canManageDonations'), deleteExpenseAdmin);

router.put('/campaigns/:id', requirePermission('canManageDonations'), updateCampaignAdmin);
router.delete('/campaigns/:id', requirePermission('canManageDonations'), deleteCampaignAdmin);

module.exports = router;
