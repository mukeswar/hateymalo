const mongoose = require('mongoose');

// Atomic invoice number sequence, one document per prefix + fiscal year
// (e.g. _id "HM-2083/84"). Incremented with $inc so two finance staff issuing
// at the same moment can never get the same number.
const invoiceCounterSchema = new mongoose.Schema(
  {
    _id: { type: String },
    seq: { type: Number, default: 0 },
  },
  { versionKey: false }
);

invoiceCounterSchema.statics.next = async function next(key) {
  const doc = await this.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return doc.seq;
};

module.exports = mongoose.model('InvoiceCounter', invoiceCounterSchema);
