const mongoose = require('mongoose');

// The revenue ledger: one row per money event, never edited. A correction is
// a new row with the opposite sign (`reversalOf` points at the original), so
// the history stays auditable and every total is a plain sum.
//
// Each stage is its own row, so a report can never add contracted money to
// received money by mistake:
//   CONTRACTED  sponsorship deal agreed / ad campaign approved (adjusted when the value changes)
//   INVOICED    invoice issued (net of VAT; VAT kept in `vatPaisa`)
//   RECEIVED    money in the bank (invoice payment, direct deal payment, other income)
//   SPENT       money spent on revenue work (printing, production, transport…)
// Projected income is not stored; it is computed live from the open pipeline.
// Donations have their own ledger and never appear here. In-kind items are
// never cash and never appear here.
const SOURCES = ['SPONSORSHIP', 'ADVERTISING', 'MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'];
const STAGES = ['CONTRACTED', 'INVOICED', 'RECEIVED', 'SPENT'];
const METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];

const ledgerEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, default: Date.now },
    source: { type: String, enum: SOURCES, required: true },
    stage: { type: String, enum: STAGES, required: true },
    // Paisa (1 NPR = 100 paisa), signed: reversals are negative
    amountPaisa: { type: Number, required: true },
    vatPaisa: { type: Number, default: 0 },
    description: { type: String, required: true, maxlength: 300 },
    sponsorAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorAccount', default: null },
    deal: { type: mongoose.Schema.Types.ObjectId, ref: 'SponsorshipDeal', default: null },
    adCampaign: { type: mongoose.Schema.Types.ObjectId, ref: 'AdCampaign', default: null },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    // Sub-record that caused it (invoice payment or deal payment id)
    payment: { type: mongoose.Schema.Types.ObjectId, default: null },
    method: { type: String, enum: [...METHODS, ''], default: '' },
    reference: { type: String, default: '', maxlength: 120 },
    // MANUAL rows were typed by finance staff; the rest are written by the system
    origin: { type: String, enum: ['SYSTEM', 'MANUAL'], default: 'SYSTEM' },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: 'LedgerEntry', default: null },
    reversed: { type: Boolean, default: false },
    note: { type: String, default: '', maxlength: 500 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ date: -1 });
ledgerEntrySchema.index({ stage: 1, source: 1, date: -1 });
ledgerEntrySchema.index({ deal: 1, stage: 1 });
ledgerEntrySchema.index({ adCampaign: 1, stage: 1 });
ledgerEntrySchema.index({ invoice: 1 });

const LedgerEntry = mongoose.model('LedgerEntry', ledgerEntrySchema);
Object.assign(LedgerEntry, { SOURCES, STAGES, METHODS });
module.exports = LedgerEntry;
