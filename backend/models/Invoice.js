const mongoose = require('mongoose');

// An invoice to a sponsor / advertiser. Each invoice bills ONE subject — a
// sponsorship deal, an ad campaign, or other income (media production, CSR…)
// — so a payment never has to be split between deals.
//
// status: DRAFT → ISSUED → PARTIALLY_PAID → PAID;  ISSUED (no payments) → VOID
// The number (e.g. HM-2083/84-0007) is assigned only when the invoice is
// issued, so the series has no gaps; a voided invoice keeps its number.
// Money is stored in paisa (1 NPR = 100 paisa).
const STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'];
const SUBJECTS = ['SPONSORSHIP_DEAL', 'AD_CAMPAIGN', 'OTHER'];
const METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];

const partySchema = new mongoose.Schema(
  {
    name: { type: String, default: '', maxlength: 160 },
    pan: { type: String, default: '', maxlength: 20 },
    vatRegistered: { type: Boolean, default: false },
    address: { type: String, default: '', maxlength: 300 },
    email: { type: String, default: '', maxlength: 160 },
    phone: { type: String, default: '', maxlength: 40 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    number: { type: String, default: null },
    fiscalYear: { type: String, default: '' },
    status: { type: String, enum: STATUSES, default: 'DRAFT' },
    // A VAT-registered seller issues a tax invoice; otherwise a plain invoice with no VAT
    kind: { type: String, enum: ['TAX_INVOICE', 'INVOICE'], default: 'INVOICE' },
    sponsorAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorAccount', required: true },
    subjectType: { type: String, enum: SUBJECTS, required: true },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipDeal', default: null },
    adCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign', default: null },
    source: { type: String, enum: ['SPONSORSHIP', 'ADVERTISING', 'MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'], required: true },
    lines: [
      {
        description: { type: String, required: true, maxlength: 300 },
        quantity: { type: Number, default: 1, min: 0.01 },
        unitPricePaisa: { type: Number, required: true, min: 0 },
        amountPaisa: { type: Number, required: true, min: 0 },
      },
    ],
    subtotalPaisa: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0, min: 0, max: 100 },
    vatPaisa: { type: Number, default: 0 },
    totalPaisa: { type: Number, default: 0 },
    paidPaisa: { type: Number, default: 0 },
    issueDate: { type: Date, default: null },
    dueDate: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    // Snapshots taken at issue time so later profile edits never change an issued invoice
    seller: { type: partySchema, default: () => ({}) },
    billTo: { type: partySchema, default: () => ({}) },
    paymentInstructions: { type: String, default: '', maxlength: 2000 },
    footerNote: { type: String, default: '', maxlength: 1000 },
    payments: [
      {
        amountPaisa: { type: Number, required: true, min: 1 },
        method: { type: String, enum: METHODS, default: 'BANK_TRANSFER' },
        reference: { type: String, default: '', maxlength: 120 },
        receivedAt: { type: Date, required: true },
        note: { type: String, default: '', maxlength: 300 },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        recordedAt: { type: Date, default: Date.now },
        // Mirror in SponsorshipDeal.payments (deal invoices only)
        dealPayment: { type: mongoose.Schema.Types.ObjectId, default: null },
      },
    ],
    voidReason: { type: String, default: '', maxlength: 500 },
    voidedAt: { type: Date, default: null },
    voidedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

invoiceSchema.index({ number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'string' } } });
invoiceSchema.index({ sponsorAccount: 1, createdAt: -1 });
invoiceSchema.index({ deal: 1 });
invoiceSchema.index({ adCampaign: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
Object.assign(Invoice, { STATUSES, SUBJECTS, METHODS });
module.exports = Invoice;
