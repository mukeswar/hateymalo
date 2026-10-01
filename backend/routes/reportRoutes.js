const express = require('express');
const router = express.Router();
const {
  createReport,
  getAllReports,
  resolveReportAction,
} = require('../controllers/reportController');
const { protect, adminOnly } = require('../middleware/auth');

router.route('/')
  .post(protect, createReport)
  .get(protect, adminOnly, getAllReports);

router.put('/:id/resolve', protect, adminOnly, resolveReportAction);

module.exports = router;
