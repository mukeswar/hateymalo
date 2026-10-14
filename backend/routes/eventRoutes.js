const express = require('express');
const router = express.Router();
const {
  createEvent,
  getAllEvents,
  getEventById,
  toggleEventInterest,
  toggleEventJoin,
  updateEvent,
  toggleFeaturedEvent,
  deleteEvent,
} = require('../controllers/eventController');
const { protect, requirePermission } = require('../middleware/auth');

router.route('/')
  .get(getAllEvents)
  .post(protect, requirePermission('canManageEvents'), createEvent);

router.get('/:id', getEventById);
router.put('/:id', protect, requirePermission('canManageEvents'), updateEvent);
router.put('/:id/feature', protect, requirePermission('canManageEvents'), toggleFeaturedEvent);
router.delete('/:id', protect, requirePermission('canManageEvents'), deleteEvent);
router.post('/:id/interest', protect, toggleEventInterest);
router.post('/:id/join', protect, toggleEventJoin);

module.exports = router;
