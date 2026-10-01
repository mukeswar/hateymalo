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
const { protect, adminOnly } = require('../middleware/auth');

router.route('/')
  .get(getAllEvents)
  .post(protect, adminOnly, createEvent);

router.get('/:id', getEventById);
router.put('/:id', protect, adminOnly, updateEvent);
router.put('/:id/feature', protect, adminOnly, toggleFeaturedEvent);
router.delete('/:id', protect, adminOnly, deleteEvent);
router.post('/:id/interest', protect, toggleEventInterest);
router.post('/:id/join', protect, toggleEventJoin);

module.exports = router;
