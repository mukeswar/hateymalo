const express = require('express');
const router = express.Router();
const {
  getRechartsAnalytics,
  getApprovalCenterItems,
  handleBulkPostAction,
  getAuditLogs,
  createStaffAccount,
  updateStaffPermissions,
  deleteStaffAccount,
  getAccessCatalog,
  getPlatformSettings,
  updatePlatformSettings,
} = require('../controllers/superAdminController');
const { protect, adminOnly, superAdminOnly, requirePermission } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/analytics', getRechartsAnalytics);
router.get('/approval-center', requirePermission('canApprovePosts'), getApprovalCenterItems);
router.post('/posts/bulk', requirePermission('canApprovePosts'), handleBulkPostAction);

router.get('/settings', getPlatformSettings);
router.put('/settings', superAdminOnly, updatePlatformSettings);

router.get('/audit-logs', superAdminOnly, getAuditLogs);
router.get('/access-catalog', superAdminOnly, getAccessCatalog);
router.post('/staff', superAdminOnly, createStaffAccount);
router.put('/staff/:id/permissions', superAdminOnly, updateStaffPermissions);
router.delete('/staff/:id', superAdminOnly, deleteStaffAccount);

module.exports = router;
