const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getActiveAnnouncements,
} = require('../controllers/announcementController');
const { protect, requirePermission } = require('../middleware/auth');

router.route('/')
  .get(getActiveAnnouncements)
  .post(protect, requirePermission('canSendNotifications'), createAnnouncement);

module.exports = router;
