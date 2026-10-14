const express = require('express');
const router = express.Router();
const {
  createReport,
  getAllReports,
  resolveReportAction,
} = require('../controllers/reportController');
const { protect, requirePermission } = require('../middleware/auth');

router.route('/')
  .post(protect, createReport)
  .get(protect, requirePermission('canManageReports'), getAllReports);

router.put('/:id/resolve', protect, requirePermission('canManageReports'), resolveReportAction);

module.exports = router;
