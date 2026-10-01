const express = require('express');
const router = express.Router();
const {
  createDonationCampaign,
  getDonationCampaigns,
  submitDonation,
  getFinancialTransparency,
  addExpenseRecord,
} = require('../controllers/donationController');
const { protect } = require('../middleware/auth');

router.post('/', protect, submitDonation);

router.route('/campaigns')
  .get(getDonationCampaigns)
  .post(protect, createDonationCampaign);

router.get('/campaigns/:id/transparency', getFinancialTransparency);
router.post('/campaigns/:id/expenses', protect, addExpenseRecord);

module.exports = router;
