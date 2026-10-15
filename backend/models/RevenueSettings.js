const mongoose = require('mongoose');

// Billing profile used on invoices (one document). Kept out of the public
// PlatformSettings so it is only readable by finance staff.
// VAT: Nepal's standard rate is 13%, but only a VAT-registered seller may
// charge it — until `vatRegistered` is on, invoices carry no VAT. Confirm the
// treatment of advertising and sponsorship income with an accountant.
const revenueSettingsSchema = new mongoose.Schema(
  {
    sellerName: { type: String, default: 'Hateymalo', maxlength: 160 },
    sellerPan: { type: String, default: '', maxlength: 20 },
    sellerAddress: { type: String, default: '', maxlength: 300 },
    sellerEmail: { type: String, default: '', maxlength: 160 },
    sellerPhone: { type: String, default: '', maxlength: 40 },
    vatRegistered: { type: Boolean, default: false },
    vatRate: { type: Number, default: 13, min: 0, max: 100 },
    invoicePrefix: { type: String, default: 'HM', maxlength: 10, match: /^[A-Z0-9]{1,10}$/ },
    // First day of the Nepali fiscal year (1 Shrawan) as an AD month-day; it falls on 16 or 17 July
    fiscalYearStart: { type: String, default: '07-17', match: /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/ },
    defaultDueDays: { type: Number, default: 15, min: 0, max: 180 },
    paymentInstructions: { type: String, default: '', maxlength: 2000 },
    footerNote: { type: String, default: '', maxlength: 1000 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

revenueSettingsSchema.statics.get = async function get() {
  return (await this.findOne()) || this.create({});
};

module.exports = mongoose.model('RevenueSettings', revenueSettingsSchema);
