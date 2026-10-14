const express = require('express');
const router = express.Router();
const c = require('../controllers/sponsorshipController');
const { protect, optionalAuth, requirePermission } = require('../middleware/auth');

// Fine-grained checks (organisers, sponsor membership, finance) live in the
// controller; route guards cover the permission-only endpoints.
const manage = requirePermission('canManageSponsorships');
const finance = requirePermission('canManageSponsorFinance');

// Public
router.get('/opportunities', c.listPublicOpportunities);
router.get('/opportunities/:id', optionalAuth, c.getPublicOpportunity);

// Sponsor accounts (any signed-in member can register one)
router.post('/accounts', protect, c.createAccount);
router.get('/accounts/mine', protect, c.myAccounts);
router.get('/accounts/:id', protect, c.getAccount);
router.put('/accounts/:id', protect, c.updateAccount);
router.post('/accounts/:id/members', protect, c.addAccountMember);
router.delete('/accounts/:id/members/:userId', protect, c.removeAccountMember);

// Sponsor-side deals
router.post('/opportunities/:id/apply', protect, c.applyToOpportunity);
router.get('/deals/mine', protect, c.myDeals);
router.get('/deals/:id', protect, c.getDeal);
router.put('/deals/:id/sponsor', protect, c.sponsorUpdateDeal);
router.post('/deals/:id/messages', protect, c.postDealMessage);

// Staff / organisers
router.get('/admin/summary', protect, c.adminSummary);
router.get('/admin/accounts', protect, c.adminListAccounts);
router.put('/admin/accounts/:id/verify', protect, manage, c.verifyAccount);
router.get('/admin/opportunities', protect, c.adminListOpportunities);
router.get('/admin/deals', protect, c.adminListDeals);

router.post('/opportunities', protect, manage, c.createOpportunity);
router.put('/opportunities/:id', protect, c.updateOpportunity);
router.delete('/opportunities/:id', protect, manage, c.deleteOpportunity);
router.get('/opportunities/:id/brand-kit', protect, c.getBrandKit);
router.put('/opportunities/:id/brand-kit', protect, c.updateBrandKit);

router.get('/tiers', protect, manage, c.listTiers);
router.post('/tiers', protect, manage, c.createTier);
router.put('/tiers/:id', protect, manage, c.updateTier);
router.delete('/tiers/:id', protect, manage, c.deleteTier);

router.put('/deals/:id/stage', protect, c.changeDealStage);
router.put('/deals/:id', protect, manage, c.updateDealTerms);
router.post('/deals/:id/deliverables', protect, c.addDeliverable);
router.put('/deals/:id/deliverables/:did', protect, c.updateDeliverable);
router.delete('/deals/:id/deliverables/:did', protect, manage, c.deleteDeliverable);
router.put('/deals/:id/report', protect, c.updateDealReport);
router.post('/deals/:id/payments', protect, finance, c.recordPayment);
router.delete('/deals/:id/payments/:pid', protect, finance, c.deletePayment);

module.exports = router;
