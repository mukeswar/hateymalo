const express = require('express');
const router = express.Router();
const c = require('../controllers/revenueController');
const { protect, requirePermission } = require('../middleware/auth');

// Finance staff (invoices, payments, ledger, billing profile). Sponsor access to
// their own invoices and the totals-only summary are checked in the controller.
const finance = requirePermission('canManageRevenue');

router.get('/summary', protect, c.summary);

router.get('/settings', protect, finance, c.getSettings);
router.put('/settings', protect, finance, c.updateSettings);

router.get('/billables', protect, finance, c.listBillables);
router.get('/invoices/mine', protect, c.myInvoices);
router.get('/invoices', protect, finance, c.listInvoices);
router.post('/invoices', protect, finance, c.createInvoice);
router.get('/invoices/:id', protect, c.getInvoice);
router.put('/invoices/:id', protect, finance, c.updateInvoice);
router.delete('/invoices/:id', protect, finance, c.deleteInvoice);
router.post('/invoices/:id/issue', protect, finance, c.issueInvoice);
router.post('/invoices/:id/void', protect, finance, c.voidInvoice);
router.post('/invoices/:id/payments', protect, finance, c.recordInvoicePayment);
router.delete('/invoices/:id/payments/:pid', protect, finance, c.deleteInvoicePayment);

router.get('/ledger', protect, finance, c.listLedger);
router.post('/ledger', protect, finance, c.createManualEntry);
router.delete('/ledger/:id', protect, finance, c.reverseManualEntry);

module.exports = router;
