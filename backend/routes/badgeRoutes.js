const express = require('express');
const router = express.Router();
const { getUserBadges } = require('../controllers/badgeController');

router.get('/user/:userId', getUserBadges);

module.exports = router;
