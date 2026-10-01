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
  getPlatformSettings,
  updatePlatformSettings,
} = require('../controllers/superAdminController');
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');

router.use(protect, adminOnly);

router.get('/analytics', getRechartsAnalytics);
router.get('/approval-center', getApprovalCenterItems);
router.post('/posts/bulk', handleBulkPostAction);

router.get('/settings', getPlatformSettings);
router.put('/settings', superAdminOnly, updatePlatformSettings);

router.get('/audit-logs', superAdminOnly, getAuditLogs);
router.post('/staff', superAdminOnly, createStaffAccount);
router.put('/staff/:id/permissions', superAdminOnly, updateStaffPermissions);
router.delete('/staff/:id', superAdminOnly, deleteStaffAccount);

module.exports = router;
