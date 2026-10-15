const express = require('express');
const router = express.Router();
const c = require('../controllers/adController');
const { protect, optionalAuth, requirePermission } = require('../middleware/auth');

// Advertiser membership and staff access are checked in the controller;
// route guards cover the permission-only endpoints.
const review = requirePermission('canReviewAds');

// Public: rate cards, serving and measurement (optionalAuth so staff views are filtered)
router.get('/placements', c.listPlacements);
router.get('/serve', optionalAuth, c.serveAds);
// navigator.sendBeacon posts text/plain (no CORS preflight), so accept a JSON string body too
const beaconBody = [express.text({ type: 'text/plain', limit: '32kb' }), (req, res, next) => {
  if (typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body); } catch { req.body = {}; }
  }
  next();
}];
router.post('/events', beaconBody, optionalAuth, c.trackEvents);
router.get('/click', optionalAuth, c.clickAd);

// Advertisers (sponsor account members) and ad managers
router.post('/campaigns', protect, c.createCampaign);
router.get('/campaigns/mine', protect, c.myCampaigns);
router.get('/campaigns/:id', protect, c.getCampaign);
router.put('/campaigns/:id', protect, c.updateCampaign);
router.delete('/campaigns/:id', protect, c.deleteCampaign);
router.post('/campaigns/:id/submit', protect, c.submitCampaign);
router.post('/campaigns/:id/status', protect, c.changeCampaignStatus);
router.get('/campaigns/:id/report', protect, c.campaignReport);

// Staff
router.get('/admin/summary', protect, c.adminSummary);
router.get('/admin/campaigns', protect, c.adminListCampaigns);
router.put('/campaigns/:id/review', protect, review, c.reviewCampaign);
router.get('/admin/placements', protect, c.adminListPlacements);
router.post('/admin/placements', protect, review, c.createPlacement);
router.put('/admin/placements/:id', protect, review, c.updatePlacement);
router.delete('/admin/placements/:id', protect, review, c.deletePlacement);

module.exports = router;
