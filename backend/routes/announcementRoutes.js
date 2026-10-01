const express = require('express');
const router = express.Router();
const {
  createAnnouncement,
  getActiveAnnouncements,
} = require('../controllers/announcementController');
const { protect, adminOnly } = require('../middleware/auth');

router.route('/')
  .get(getActiveAnnouncements)
  .post(protect, adminOnly, createAnnouncement);

module.exports = router;
