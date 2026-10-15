const mongoose = require('mongoose');
const { DELIVERABLE_TYPES, RESOURCE_TYPES } = require('./SponsorshipOpportunity');

// One sponsor's relationship with one opportunity: proposal → review →
// negotiation → agreement → fulfilment. Money is kept in separate stages:
// `proposal.amount` (projected), `cashAmount` (contracted), `payments`
// (received). In-kind items carry their own estimated value and valuation
// method and are never counted as cash.
const STAGES = ['APPLIED', 'IN_REVIEW', 'NEGOTIATING', 'AGREED', 'FULFILLED', 'DECLINED', 'WITHDRAWN', 'CANCELLED'];
const CONTRACTED_STAGES = ['AGREED', 'FULFILLED'];

const dealSchema = new mongoose.Schema(
  {
    opportunity: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipOpportunity', required: true },
    sponsor: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorAccount', required: true },
    tier: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipTier', default: null },
    isCustomQuote: { type: Boolean, default: false },
    stage: { type: String, enum: STAGES, default: 'APPLIED' },

    proposal: {
      message: { type: String, default: '', maxlength: 4000 },
      contributionTypes: [{ type: String, enum: RESOURCE_TYPES }],
      amount: { type: Number, default: 0, min: 0 }, // projected cash, whole NPR
      submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    cashAmount: { type: Number, default: 0, min: 0 }, // contracted cash, whole NPR
    inKindItems: [
      {
        type: { type: String, enum: RESOURCE_TYPES, default: 'MATERIALS' },
        description: { type: String, required: true, maxlength: 300 },
        quantity: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: '', maxlength: 30 },
        estimatedValue: { type: Number, default: 0, min: 0 }, // whole NPR, reported separately from cash
        valuationMethod: {
          type: String,
          enum: ['SPONSOR_INVOICE', 'MARKET_QUOTE', 'SPONSOR_DECLARED', 'STAFF_ESTIMATE', 'NOT_VALUED'],
          default: 'NOT_VALUED',
        },
        status: { type: String, enum: ['PLEDGED', 'RECEIVED', 'CANCELLED'], default: 'PLEDGED' },
        receivedAt: { type: Date, default: null },
      },
    ],

    agreement: {
      documentUrl: { type: String, default: '' },
      terms: { type: String, default: '', maxlength: 4000 },
      signedAt: { type: Date, default: null },
      signedByName: { type: String, default: '', maxlength: 120 },
    },

    payments: [
      {
        amount: { type: Number, required: true, min: 1 },
        method: { type: String, enum: ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'], default: 'BANK_TRANSFER' },
        reference: { type: String, default: '', maxlength: 120 },
        receivedAt: { type: Date, required: true },
        note: { type: String, default: '', maxlength: 300 },
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        recordedAt: { type: Date, default: Date.now },
        // Set when the payment was recorded against an invoice (see Invoice.payments)
        invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
      },
    ],

    deliverables: [
      {
        title: { type: String, required: true, maxlength: 200 },
        type: { type: String, enum: DELIVERABLE_TYPES, default: 'OTHER' },
        dueDate: { type: Date, default: null },
        status: { type: String, enum: ['PENDING', 'IN_PROGRESS', 'DONE', 'WAIVED'], default: 'PENDING' },
        proofUrls: { type: [String], default: [] },
        proofNote: { type: String, default: '', maxlength: 1000 },
        completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        completedAt: { type: Date, default: null },
      },
    ],

    // Brand use: the sponsor must approve before their logo appears anywhere
    logoUrl: { type: String, default: '' },
    logoUsageApproved: { type: Boolean, default: false },
    logoApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    logoApprovedAt: { type: Date, default: null },
    showOnPublicPage: { type: Boolean, default: true },

    // Negotiation thread. `internal` notes are visible to staff/organizers only.
    messages: [
      {
        author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorSide: { type: String, enum: ['SPONSOR', 'HATEYMALO'], required: true },
        body: { type: String, required: true, maxlength: 3000 },
        internal: { type: Boolean, default: false },
        at: { type: Date, default: Date.now },
      },
    ],

    history: [
      {
        stage: { type: String, enum: STAGES },
        note: { type: String, default: '', maxlength: 500 },
        by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date, default: Date.now },
      },
    ],

    report: {
      summary: { type: String, default: '', maxlength: 8000 },
      highlights: { type: [String], default: [] },
      mediaUrls: { type: [String], default: [] },
      sharedAt: { type: Date, default: null },
      sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
  },
  { timestamps: true }
);

dealSchema.index({ opportunity: 1, stage: 1 });
dealSchema.index({ sponsor: 1 });

dealSchema.virtual('amountReceived').get(function amountReceived() {
  return (this.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0);
});
dealSchema.virtual('inKindEstimatedValue').get(function inKindEstimatedValue() {
  return (this.inKindItems || []).filter((i) => i.status !== 'CANCELLED').reduce((sum, i) => sum + (i.estimatedValue || 0), 0);
});
dealSchema.set('toJSON', { virtuals: true });
dealSchema.set('toObject', { virtuals: true });

const SponsorshipDeal = mongoose.model('SponsorshipDeal', dealSchema);
module.exports = SponsorshipDeal;
module.exports.STAGES = STAGES;
module.exports.CONTRACTED_STAGES = CONTRACTED_STAGES;
