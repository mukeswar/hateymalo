const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const InvoiceCounter = require('../models/InvoiceCounter');
const LedgerEntry = require('../models/LedgerEntry');
const RevenueSettings = require('../models/RevenueSettings');
const SponsorAccount = require('../models/SponsorAccount');
const SponsorshipDeal = require('../models/SponsorshipDeal');
const AdCampaign = require('../models/AdCampaign');
const Notification = require('../models/Notification');
const { hasPermission } = require('../utils/permissions');
const { createAuditLog } = require('../utils/auditLogger');
const { contractedValueOf } = require('../utils/adMoney');
const { toPaisa, postEntry, reverseEntry, sumPaisa, syncAllContracted, fiscalYearOf } = require('../utils/ledger');

const { METHODS, SOURCES } = LedgerEntry;
const CONTRACTED_DEAL_STAGES = ['AGREED', 'FULFILLED'];
const OPEN_INVOICE = ['ISSUED', 'PARTIALLY_PAID'];
const BILLED = ['ISSUED', 'PARTIALLY_PAID', 'PAID'];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const isId = (v) => mongoose.isValidObjectId(v);
const sameId = (a, b) => !!a && !!b && String(a._id || a) === String(b._id || b);
const fail = (res, status, message, extra = {}) => res.status(status).json({ success: false, message, ...extra });
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const pick = (val, allowed, fallback) => (allowed.includes(val) ? val : fallback);
const optDate = (v) => {
  if (v === null || v === '' || v === undefined) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};
// NPR (up to 2 decimals) → paisa; NaN/negative → null
const parseNpr = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
};
const npr = (paisa) => `Rs. ${(paisa / 100).toLocaleString('en-IN', { minimumFractionDigits: paisa % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

const canRevenue = (u) => hasPermission(u, 'canManageRevenue');
// Totals-only access for people who run sponsorship / ads but do not handle money
const canSeeSummary = (u) => canRevenue(u) || ['canManageSponsorFinance', 'canManageSponsorships', 'canManageAds', 'canReviewAds'].some((k) => hasPermission(u, k));

const memberRole = (account, u) => {
  if (!u || !account) return null;
  const m = (account.members || []).find((x) => sameId(x.user, u._id));
  return m ? m.role : null;
};

const audit = (req, action, targetId = null, details = '') =>
  createAuditLog({ adminUser: req.user, action, targetType: 'REVENUE', targetId, details, req });

const notifyAccount = async (accountId, senderId, title, message, link) => {
  const acc = await SponsorAccount.findById(accountId).select('members');
  if (!acc) return;
  const ids = acc.members.map((m) => String(m.user)).filter((id) => id !== String(senderId));
  if (ids.length) await Notification.insertMany(ids.map((recipient) => ({ recipient, sender: senderId, type: 'BILLING', title, message, link })));
};

const isOverdue = (inv) => OPEN_INVOICE.includes(inv.status) && inv.dueDate && new Date(inv.dueDate) < new Date();

const shapeInvoice = (doc, u) => {
  const inv = doc.toObject ? doc.toObject() : doc;
  const finance = canRevenue(u);
  return {
    ...inv,
    balancePaisa: Math.max(0, (inv.totalPaisa || 0) - (inv.paidPaisa || 0)),
    overdue: isOverdue(inv),
    // Sponsors see when and how they paid, not who on our side recorded it
    payments: (inv.payments || []).map((p) => (finance ? p : { _id: p._id, amountPaisa: p.amountPaisa, method: p.method, reference: p.reference, receivedAt: p.receivedAt })),
    viewer: { isFinance: finance, sponsorRole: memberRole(inv.sponsorAccount, u) },
    sponsorAccount: inv.sponsorAccount && inv.sponsorAccount.members ? { _id: inv.sponsorAccount._id, name: inv.sponsorAccount.name, type: inv.sponsorAccount.type } : inv.sponsorAccount,
  };
};

const loadInvoice = (id) =>
  Invoice.findById(id)
    .populate('sponsorAccount', 'name type panNumber vatRegistered address contactEmail contactPhone members')
    .populate({ path: 'deal', select: 'stage cashAmount opportunity', populate: { path: 'opportunity', select: 'title' } })
    .populate('adCampaign', 'title status pricingModel');

// Recompute totals from lines and the VAT setting
const computeTotals = (inv, settings) => {
  inv.lines.forEach((l) => {
    l.amountPaisa = Math.round(l.unitPricePaisa * l.quantity);
  });
  inv.subtotalPaisa = inv.lines.reduce((s, l) => s + l.amountPaisa, 0);
  inv.kind = settings.vatRegistered ? 'TAX_INVOICE' : 'INVOICE';
  inv.vatRate = settings.vatRegistered ? settings.vatRate : 0;
  inv.vatPaisa = Math.round((inv.subtotalPaisa * inv.vatRate) / 100);
  inv.totalPaisa = inv.subtotalPaisa + inv.vatPaisa;
};

const parseLines = (arr) => {
  const errors = [];
  if (!Array.isArray(arr) || !arr.length) return { lines: [], errors: ['Add at least one line'] };
  const lines = arr.slice(0, 30).map((l, i) => {
    const unit = parseNpr(l?.unitPrice);
    const qty = Math.round(Number(l?.quantity ?? 1) * 100) / 100;
    const description = str(l?.description, 300);
    if (!description) errors.push(`Line ${i + 1}: add a description`);
    if (unit === null) errors.push(`Line ${i + 1}: price must be a positive number`);
    if (!(qty > 0) || qty > 100000) errors.push(`Line ${i + 1}: quantity must be more than 0`);
    return { description, quantity: qty || 1, unitPricePaisa: unit || 0, amountPaisa: 0 };
  });
  return { lines, errors };
};

// Contracted vs already-billed value for one deal or campaign (paisa)
const billingPosition = async ({ deal, adCampaign, excludeInvoice }) => {
  let contracted = 0;
  if (deal) contracted = CONTRACTED_DEAL_STAGES.includes(deal.stage) ? toPaisa(deal.cashAmount) : 0;
  if (adCampaign) contracted = toPaisa(contractedValueOf(adCampaign));
  const q = { status: { $in: BILLED }, ...(deal ? { deal: deal._id } : { adCampaign: adCampaign._id }) };
  if (excludeInvoice) q._id = { $ne: excludeInvoice };
  const billed = (await Invoice.find(q).select('subtotalPaisa')).reduce((s, i) => s + i.subtotalPaisa, 0);
  return { contractedPaisa: contracted, invoicedPaisa: billed, remainingPaisa: Math.max(0, contracted - billed) };
};

const sourceForSubject = (subjectType, requested) =>
  subjectType === 'SPONSORSHIP_DEAL' ? 'SPONSORSHIP' : subjectType === 'AD_CAMPAIGN' ? 'ADVERTISING' : pick(requested, ['MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'], 'OTHER');

/* ------------------------------------------------------------------ */
/* Billing profile                                                     */
/* ------------------------------------------------------------------ */

// GET /api/revenue/settings
const getSettings = async (req, res) => {
  try {
    res.json({ success: true, data: await RevenueSettings.get() });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/revenue/settings
const updateSettings = async (req, res) => {
  try {
    const s = await RevenueSettings.get();
    const b = req.body || {};
    for (const [k, max] of [['sellerName', 160], ['sellerPan', 20], ['sellerAddress', 300], ['sellerEmail', 160], ['sellerPhone', 40], ['paymentInstructions', 2000], ['footerNote', 1000]]) {
      if (b[k] !== undefined) s[k] = str(b[k], max);
    }
    if (b.vatRegistered !== undefined) s.vatRegistered = !!b.vatRegistered;
    if (b.vatRate !== undefined) {
      const r = Number(b.vatRate);
      if (!Number.isFinite(r) || r < 0 || r > 100) return fail(res, 400, 'VAT rate must be between 0 and 100');
      s.vatRate = Math.round(r * 100) / 100;
    }
    if (b.invoicePrefix !== undefined) {
      const p = str(b.invoicePrefix, 10).toUpperCase();
      if (!/^[A-Z0-9]{1,10}$/.test(p)) return fail(res, 400, 'Prefix must be 1–10 letters or digits');
      s.invoicePrefix = p;
    }
    if (b.fiscalYearStart !== undefined) {
      if (!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(b.fiscalYearStart)) return fail(res, 400, 'Fiscal year start must look like 07-17');
      s.fiscalYearStart = b.fiscalYearStart;
    }
    if (b.defaultDueDays !== undefined) s.defaultDueDays = Math.max(0, Math.min(180, Math.round(Number(b.defaultDueDays) || 0)));
    if (s.vatRegistered && !s.sellerPan) return fail(res, 400, 'Add your PAN/VAT number before turning on VAT invoices');
    s.updatedBy = req.user._id;
    await s.save();
    audit(req, `Updated billing profile${b.vatRegistered !== undefined ? ` (VAT ${s.vatRegistered ? `on, ${s.vatRate}%` : 'off'})` : ''}`, s._id);
    res.json({ success: true, message: 'Billing profile saved', data: s });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

// GET /api/revenue/billables?sponsorAccount=<id>  — what can still be invoiced
const listBillables = async (req, res) => {
  try {
    if (!isId(req.query.sponsorAccount)) return fail(res, 400, 'Choose a sponsor account');
    const deals = await SponsorshipDeal.find({ sponsor: req.query.sponsorAccount, stage: { $in: CONTRACTED_DEAL_STAGES } }).populate('opportunity', 'title').populate('tier', 'name');
    const campaigns = await AdCampaign.find({ advertiser: req.query.sponsorAccount, status: { $in: ['APPROVED', 'PAUSED', 'ENDED', 'ARCHIVED'] } });
    const out = { deals: [], adCampaigns: [] };
    for (const d of deals) {
      const pos = await billingPosition({ deal: d });
      out.deals.push({ _id: d._id, title: d.opportunity?.title || 'Sponsorship', tier: d.tier?.name || (d.isCustomQuote ? 'Custom' : ''), stage: d.stage, ...pos });
    }
    for (const c of campaigns) {
      const pos = await billingPosition({ adCampaign: c });
      if (pos.contractedPaisa > 0) out.adCampaigns.push({ _id: c._id, title: c.title, status: c.status, pricingModel: c.pricingModel, ...pos });
    }
    res.json({ success: true, data: out });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/revenue/invoices  { sponsorAccount, subjectType, deal?, adCampaign?, source?, lines:[{description, quantity, unitPrice}], dueDate?, notes? }
const createInvoice = async (req, res) => {
  try {
    const b = req.body || {};
    if (!isId(b.sponsorAccount)) return fail(res, 400, 'Choose who the invoice is for');
    const account = await SponsorAccount.findById(b.sponsorAccount);
    if (!account) return fail(res, 404, 'Sponsor account not found');
    const subjectType = pick(b.subjectType, Invoice.SUBJECTS, null);
    if (!subjectType) return fail(res, 400, 'Choose what the invoice is for: a sponsorship deal, an ad campaign or other income');
    const inv = new Invoice({ sponsorAccount: account._id, subjectType, source: sourceForSubject(subjectType, b.source), createdBy: req.user._id });

    if (subjectType === 'SPONSORSHIP_DEAL') {
      const deal = isId(b.deal) ? await SponsorshipDeal.findById(b.deal) : null;
      if (!deal || !sameId(deal.sponsor, account._id)) return fail(res, 400, 'Choose one of this sponsor’s deals');
      if (!CONTRACTED_DEAL_STAGES.includes(deal.stage)) return fail(res, 400, 'Only agreed deals can be invoiced');
      inv.deal = deal._id;
    } else if (subjectType === 'AD_CAMPAIGN') {
      const c = isId(b.adCampaign) ? await AdCampaign.findById(b.adCampaign) : null;
      if (!c || !sameId(c.advertiser, account._id)) return fail(res, 400, 'Choose one of this advertiser’s campaigns');
      if (contractedValueOf(c) <= 0) return fail(res, 400, 'Only approved campaigns with a price can be invoiced');
      inv.adCampaign = c._id;
    }

    const { lines, errors } = parseLines(b.lines);
    if (errors.length) return fail(res, 400, errors[0]);
    inv.lines = lines;
    const settings = await RevenueSettings.get();
    const due = optDate(b.dueDate);
    if (due === undefined) return fail(res, 400, 'Due date is not valid');
    inv.dueDate = due;
    inv.notes = str(b.notes, 2000);
    computeTotals(inv, settings);
    if (inv.subtotalPaisa <= 0) return fail(res, 400, 'The invoice total must be more than zero');
    await inv.save();
    audit(req, `Drafted invoice for ${account.name} (${npr(inv.totalPaisa)})`, inv._id);
    res.status(201).json({ success: true, message: 'Invoice saved as a draft', data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// PUT /api/revenue/invoices/:id  (drafts only) { lines?, dueDate?, notes? }
const updateInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    if (inv.status !== 'DRAFT') return fail(res, 400, 'Issued invoices cannot be changed. Void it and issue a new one.');
    const b = req.body || {};
    if (b.lines !== undefined) {
      const { lines, errors } = parseLines(b.lines);
      if (errors.length) return fail(res, 400, errors[0]);
      inv.lines = lines;
    }
    if (b.dueDate !== undefined) {
      const d = optDate(b.dueDate);
      if (d === undefined) return fail(res, 400, 'Due date is not valid');
      inv.dueDate = d;
    }
    if (b.notes !== undefined) inv.notes = str(b.notes, 2000);
    if (b.source !== undefined && inv.subjectType === 'OTHER') inv.source = sourceForSubject('OTHER', b.source);
    computeTotals(inv, await RevenueSettings.get());
    if (inv.subtotalPaisa <= 0) return fail(res, 400, 'The invoice total must be more than zero');
    await inv.save();
    res.json({ success: true, message: 'Draft saved', data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/revenue/invoices/:id  (drafts only — issued invoices are voided)
const deleteInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    if (inv.status !== 'DRAFT') return fail(res, 409, 'Issued invoices keep their number and cannot be deleted. Void it instead.');
    await inv.deleteOne();
    audit(req, 'Deleted a draft invoice', inv._id);
    res.json({ success: true, message: 'Draft deleted' });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/revenue/invoices/:id/issue  { issueDate? }
const issueInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await loadInvoice(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    if (inv.status !== 'DRAFT') return fail(res, 400, 'This invoice was already issued');
    const settings = await RevenueSettings.get();
    if (!settings.sellerName || !settings.sellerAddress) return fail(res, 400, 'Fill in the billing profile (name and address) before issuing invoices');
    if (settings.vatRegistered && !settings.sellerPan) return fail(res, 400, 'Add your PAN/VAT number to the billing profile');
    computeTotals(inv, settings);

    // Never bill more than was contracted for a deal or campaign
    if (inv.deal || inv.adCampaign) {
      const subject = inv.deal ? { deal: inv.deal } : { adCampaign: await AdCampaign.findById(inv.adCampaign._id) };
      const pos = await billingPosition({ ...subject, excludeInvoice: inv._id });
      if (inv.subtotalPaisa > pos.remainingPaisa) {
        return fail(res, 400, `This would bill more than was agreed. Contracted ${npr(pos.contractedPaisa)}, already invoiced ${npr(pos.invoicedPaisa)}, so at most ${npr(pos.remainingPaisa)} (before VAT) can be invoiced.`);
      }
    }

    const issueDate = optDate(req.body?.issueDate) || new Date();
    if (issueDate === undefined || issueDate > new Date(Date.now() + 864e5)) return fail(res, 400, 'Issue date cannot be in the future');
    inv.fiscalYear = fiscalYearOf(issueDate, settings.fiscalYearStart);
    const seq = await InvoiceCounter.next(`${settings.invoicePrefix}-${inv.fiscalYear}`);
    inv.number = `${settings.invoicePrefix}-${inv.fiscalYear}-${String(seq).padStart(4, '0')}`;
    inv.status = 'ISSUED';
    inv.issueDate = issueDate;
    if (!inv.dueDate) inv.dueDate = new Date(issueDate.getTime() + settings.defaultDueDays * 864e5);
    inv.seller = { name: settings.sellerName, pan: settings.sellerPan, vatRegistered: settings.vatRegistered, address: settings.sellerAddress, email: settings.sellerEmail, phone: settings.sellerPhone };
    const a = inv.sponsorAccount;
    inv.billTo = { name: a.name, pan: a.panNumber, vatRegistered: a.vatRegistered, address: a.address, email: a.contactEmail, phone: a.contactPhone };
    inv.paymentInstructions = settings.paymentInstructions;
    inv.footerNote = settings.footerNote;
    inv.issuedBy = req.user._id;
    await inv.save();

    await postEntry({
      date: issueDate,
      source: inv.source,
      stage: 'INVOICED',
      amountPaisa: inv.subtotalPaisa,
      vatPaisa: inv.vatPaisa,
      description: `Invoice ${inv.number} to ${a.name}`,
      sponsorAccount: a._id,
      deal: inv.deal?._id || null,
      adCampaign: inv.adCampaign?._id || null,
      invoice: inv._id,
      createdBy: req.user._id,
    });
    audit(req, `Issued invoice ${inv.number} to ${a.name} (${npr(inv.totalPaisa)})`, inv._id);
    notifyAccount(a._id, req.user._id, `Invoice ${inv.number}`, `A new invoice for ${npr(inv.totalPaisa)} is due ${inv.dueDate.toISOString().slice(0, 10)}.`, `/sponsor/invoices/${inv._id}`).catch(() => {});
    res.json({ success: true, message: `Invoice ${inv.number} issued`, data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/revenue/invoices/:id/void  { reason }
const voidInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await loadInvoice(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    const reason = str(req.body?.reason, 500);
    if (!reason) return fail(res, 400, 'Give a reason for voiding');
    if (inv.status === 'DRAFT') return fail(res, 400, 'Drafts are deleted, not voided');
    if (inv.status === 'VOID') return fail(res, 400, 'Already void');
    if (inv.payments.length) return fail(res, 409, 'Remove the recorded payments first; an invoice with payments cannot be voided');
    inv.status = 'VOID';
    inv.voidReason = reason;
    inv.voidedAt = new Date();
    inv.voidedBy = req.user._id;
    await inv.save();
    const entries = await LedgerEntry.find({ invoice: inv._id, stage: 'INVOICED', reversed: false, reversalOf: null });
    for (const e of entries) await reverseEntry(e, { user: req.user, note: reason });
    audit(req, `Voided invoice ${inv.number}`, inv._id, reason);
    notifyAccount(inv.sponsorAccount._id, req.user._id, `Invoice ${inv.number} cancelled`, `Invoice ${inv.number} was voided: ${reason}`, `/sponsor/invoices/${inv._id}`).catch(() => {});
    res.json({ success: true, message: `Invoice ${inv.number} voided`, data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

const refreshPaid = (inv) => {
  inv.paidPaisa = inv.payments.reduce((s, p) => s + p.amountPaisa, 0);
  if (inv.status !== 'VOID') inv.status = inv.paidPaisa <= 0 ? 'ISSUED' : inv.paidPaisa >= inv.totalPaisa ? 'PAID' : 'PARTIALLY_PAID';
};

// Splits a payment into its net and VAT parts, in proportion to the invoice
const splitVat = (inv, amountPaisa) => {
  if (!inv.vatPaisa || !inv.totalPaisa) return { net: amountPaisa, vat: 0 };
  const vat = Math.round((amountPaisa * inv.vatPaisa) / inv.totalPaisa);
  return { net: amountPaisa - vat, vat };
};

// POST /api/revenue/invoices/:id/payments  { amount (NPR), method, reference, receivedAt, note }
const recordInvoicePayment = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await loadInvoice(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    if (!OPEN_INVOICE.includes(inv.status)) return fail(res, 400, inv.status === 'PAID' ? 'This invoice is already paid in full' : 'Payments can only be recorded on issued invoices');
    const amountPaisa = parseNpr(req.body?.amount);
    if (!amountPaisa || amountPaisa < 100) return fail(res, 400, 'Amount must be at least Rs. 1');
    const balance = inv.totalPaisa - inv.paidPaisa;
    if (amountPaisa > balance) return fail(res, 400, `That is more than the ${npr(balance)} still due`);
    const method = pick(req.body?.method, METHODS, 'BANK_TRANSFER');
    const reference = str(req.body?.reference, 120);
    if (method !== 'CASH' && !reference) return fail(res, 400, 'Add the bank or transaction reference');
    const receivedAt = optDate(req.body?.receivedAt) || new Date();
    if (receivedAt === undefined || receivedAt > new Date(Date.now() + 864e5)) return fail(res, 400, 'Received date cannot be in the future');
    const note = str(req.body?.note, 300);
    const { net, vat } = splitVat(inv, amountPaisa);

    inv.payments.push({ amountPaisa, method, reference, receivedAt, note, recordedBy: req.user._id });
    const payment = inv.payments[inv.payments.length - 1];

    // Deal invoices: mirror the net amount into the deal so its "received" stays right
    if (inv.deal) {
      const deal = await SponsorshipDeal.findById(inv.deal._id);
      deal.payments.push({ amount: net / 100, method, reference, receivedAt, note: `Invoice ${inv.number}${note ? ` — ${note}` : ''}`, recordedBy: req.user._id, invoice: inv._id });
      payment.dealPayment = deal.payments[deal.payments.length - 1]._id;
      await deal.save();
    }
    refreshPaid(inv);
    await inv.save();
    await postEntry({
      date: receivedAt,
      source: inv.source,
      stage: 'RECEIVED',
      amountPaisa: net,
      vatPaisa: vat,
      description: `Payment for ${inv.number} from ${inv.sponsorAccount.name}`,
      sponsorAccount: inv.sponsorAccount._id,
      deal: inv.deal?._id || null,
      adCampaign: inv.adCampaign?._id || null,
      invoice: inv._id,
      payment: payment._id,
      method,
      reference,
      createdBy: req.user._id,
    });
    audit(req, `Recorded ${npr(amountPaisa)} (${method}${reference ? ` ${reference}` : ''}) on invoice ${inv.number}`, inv._id);
    notifyAccount(inv.sponsorAccount._id, req.user._id, 'Payment received', `We received ${npr(amountPaisa)} for invoice ${inv.number}. Thank you!`, `/sponsor/invoices/${inv._id}`).catch(() => {});
    res.status(201).json({ success: true, message: inv.status === 'PAID' ? 'Payment recorded — invoice paid in full' : 'Payment recorded', data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/revenue/invoices/:id/payments/:pid?reason=
const deleteInvoicePayment = async (req, res) => {
  try {
    if (!isId(req.params.id) || !isId(req.params.pid)) return fail(res, 404, 'Not found');
    const inv = await loadInvoice(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    const p = inv.payments.id(req.params.pid);
    if (!p) return fail(res, 404, 'Payment not found');
    const reason = str(req.body?.reason || req.query?.reason, 300);
    if (!reason) return fail(res, 400, 'Give a reason for removing the payment');
    if (inv.deal && p.dealPayment) {
      const deal = await SponsorshipDeal.findById(inv.deal._id);
      const dp = deal?.payments.id(p.dealPayment);
      if (dp) {
        dp.deleteOne();
        await deal.save();
      }
    }
    const desc = `${npr(p.amountPaisa)} (${p.method}${p.reference ? ` ${p.reference}` : ''})`;
    const entries = await LedgerEntry.find({ invoice: inv._id, payment: p._id, stage: 'RECEIVED', reversed: false, reversalOf: null });
    p.deleteOne();
    refreshPaid(inv);
    await inv.save();
    for (const e of entries) await reverseEntry(e, { user: req.user, note: reason });
    audit(req, `Removed payment ${desc} from invoice ${inv.number}`, inv._id, reason);
    res.json({ success: true, message: 'Payment removed', data: shapeInvoice(await loadInvoice(inv._id), req.user) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/revenue/invoices?status=A,B&sponsorAccount=&fiscalYear=&overdue=true
const listInvoices = async (req, res) => {
  try {
    const q = {};
    if (req.query.status) q.status = { $in: String(req.query.status).split(',').map((s) => s.toUpperCase()) };
    if (isId(req.query.sponsorAccount)) q.sponsorAccount = req.query.sponsorAccount;
    if (req.query.fiscalYear) q.fiscalYear = String(req.query.fiscalYear);
    if (isId(req.query.deal)) q.deal = req.query.deal;
    if (isId(req.query.adCampaign)) q.adCampaign = req.query.adCampaign;
    if (req.query.overdue === 'true') Object.assign(q, { status: { $in: OPEN_INVOICE }, dueDate: { $lt: new Date() } });
    const list = await Invoice.find(q).populate('sponsorAccount', 'name type members').sort({ issueDate: -1, createdAt: -1 }).limit(500);
    res.json({ success: true, data: list.map((i) => shapeInvoice(i, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/revenue/invoices/mine  — sponsors: issued invoices of my accounts (no drafts)
const myInvoices = async (req, res) => {
  try {
    const accounts = await SponsorAccount.find({ 'members.user': req.user._id }).select('_id');
    const list = await Invoice.find({ sponsorAccount: { $in: accounts.map((a) => a._id) }, status: { $ne: 'DRAFT' } })
      .populate('sponsorAccount', 'name type members')
      .sort({ issueDate: -1 })
      .limit(300);
    res.json({ success: true, data: list.map((i) => shapeInvoice(i, req.user)) });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// GET /api/revenue/invoices/:id  — finance, or members of the billed account (not drafts)
const getInvoice = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Invoice not found');
    const inv = await loadInvoice(req.params.id);
    if (!inv) return fail(res, 404, 'Invoice not found');
    const finance = canRevenue(req.user);
    if (!finance && (!memberRole(inv.sponsorAccount, req.user) || inv.status === 'DRAFT')) return fail(res, 404, 'Invoice not found');
    const data = shapeInvoice(inv, req.user);
    if (finance) {
      await inv.populate('payments.recordedBy', 'name');
      data.payments = inv.toObject().payments;
      if (inv.deal) data.billing = await billingPosition({ deal: inv.deal, excludeInvoice: inv.status === 'DRAFT' ? null : undefined });
      if (inv.adCampaign) data.billing = await billingPosition({ adCampaign: await AdCampaign.findById(inv.adCampaign._id) });
    }
    res.json({ success: true, data });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Ledger                                                              */
/* ------------------------------------------------------------------ */

const rangeMatch = (q) => {
  const m = {};
  const from = optDate(q.from);
  const to = optDate(q.to);
  if (from || to) {
    m.date = {};
    if (from) m.date.$gte = from;
    if (to) m.date.$lte = new Date(to.getTime() + 864e5 - 1);
  }
  return m;
};

// GET /api/revenue/ledger?from=&to=&source=&stage=&sponsorAccount=&format=csv
const listLedger = async (req, res) => {
  try {
    await syncAllContracted();
    const q = rangeMatch(req.query);
    if (req.query.source) q.source = { $in: String(req.query.source).split(',') };
    if (req.query.stage) q.stage = { $in: String(req.query.stage).split(',') };
    if (isId(req.query.sponsorAccount)) q.sponsorAccount = req.query.sponsorAccount;
    const rows = await LedgerEntry.find(q)
      .populate('sponsorAccount', 'name')
      .populate('invoice', 'number')
      .populate('createdBy', 'name')
      .sort({ date: -1, createdAt: -1 })
      .limit(req.query.format === 'csv' ? 10000 : 1000)
      .lean();
    if (req.query.format === 'csv') {
      // Quote every text cell, and neutralise spreadsheet formulas (sponsor names are typed by sponsors)
      const esc = (v) => {
        let t = String(v ?? '');
        if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
        return `"${t.replace(/"/g, '""')}"`;
      };
      const head = ['date', 'stage', 'source', 'description', 'sponsor', 'invoice', 'amount_npr', 'vat_npr', 'method', 'reference', 'origin', 'reversal'];
      const lines = rows.map((r) =>
        [r.date.toISOString().slice(0, 10), r.stage, r.source, esc(r.description), esc(r.sponsorAccount?.name), r.invoice?.number || '', (r.amountPaisa / 100).toFixed(2), ((r.vatPaisa || 0) / 100).toFixed(2), r.method, esc(r.reference), r.origin, r.reversalOf ? 'yes' : ''].join(',')
      );
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', `attachment; filename="hateymalo-revenue-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
      return res.send([head.join(','), ...lines].join('\n'));
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// POST /api/revenue/ledger  { date, source, stage: RECEIVED|SPENT, amount, description, sponsorAccount?, method, reference, note }
const createManualEntry = async (req, res) => {
  try {
    const b = req.body || {};
    const stage = pick(b.stage, ['RECEIVED', 'SPENT'], null);
    if (!stage) return fail(res, 400, 'Manual entries are money received or money spent');
    const source = pick(b.source, SOURCES, null);
    if (!source) return fail(res, 400, 'Choose the revenue stream');
    const amountPaisa = parseNpr(b.amount);
    if (!amountPaisa || amountPaisa < 100) return fail(res, 400, 'Amount must be at least Rs. 1');
    const description = str(b.description, 300);
    if (!description) return fail(res, 400, 'Describe the entry');
    const date = optDate(b.date) || new Date();
    if (date === undefined || date > new Date(Date.now() + 864e5)) return fail(res, 400, 'Date cannot be in the future');
    const method = pick(b.method, METHODS, 'BANK_TRANSFER');
    const reference = str(b.reference, 120);
    if (stage === 'RECEIVED' && method !== 'CASH' && !reference) return fail(res, 400, 'Add the bank or transaction reference');
    // Sponsorship and ad money must come through deals and invoices, or it would be counted twice
    if (stage === 'RECEIVED' && ['SPONSORSHIP', 'ADVERTISING'].includes(source)) return fail(res, 400, 'Record sponsorship and ad payments on the deal or invoice, not as a manual entry');
    let sponsorAccount = null;
    if (b.sponsorAccount) {
      if (!isId(b.sponsorAccount) || !(await SponsorAccount.exists({ _id: b.sponsorAccount }))) return fail(res, 400, 'Sponsor account not found');
      sponsorAccount = b.sponsorAccount;
    }
    const e = await postEntry({ date, source, stage, amountPaisa, description, sponsorAccount, method, reference, origin: 'MANUAL', note: str(b.note, 500), createdBy: req.user._id });
    audit(req, `Added ledger entry: ${stage.toLowerCase()} ${npr(amountPaisa)} — ${description}`, e._id);
    res.status(201).json({ success: true, message: 'Entry added', data: e });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

// DELETE /api/revenue/ledger/:id?reason=  — reverses a manual entry
const reverseManualEntry = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, 'Entry not found');
    const e = await LedgerEntry.findById(req.params.id);
    if (!e) return fail(res, 404, 'Entry not found');
    if (e.origin !== 'MANUAL' || e.reversalOf) return fail(res, 400, 'Only manual entries can be reversed here. System entries follow their deal, campaign or invoice.');
    if (e.reversed) return fail(res, 400, 'Already reversed');
    const reason = str(req.body?.reason || req.query?.reason, 300);
    if (!reason) return fail(res, 400, 'Give a reason for the reversal');
    const rev = await reverseEntry(e, { user: req.user, note: reason });
    audit(req, `Reversed ledger entry: ${e.description}`, e._id, reason);
    res.json({ success: true, message: 'Entry reversed', data: rev });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

// GET /api/revenue/summary?from=&to=  (defaults to the current fiscal year)
const summary = async (req, res) => {
  try {
    if (!canSeeSummary(req.user)) return fail(res, 403, 'You do not have access to revenue');
    await syncAllContracted();
    const settings = await RevenueSettings.get();
    const fy = fiscalYearOf(new Date(), settings.fiscalYearStart);
    let { from, to } = req.query;
    if (!from && !to) {
      const [m, d] = settings.fiscalYearStart.split('-').map(Number);
      const bsStart = Number(fy.split('/')[0]);
      from = new Date(Date.UTC(bsStart - 57, m - 1, d)).toISOString().slice(0, 10);
    }
    const match = rangeMatch({ from, to });

    const grouped = await LedgerEntry.aggregate([
      { $match: match },
      { $group: { _id: { stage: '$stage', source: '$source' }, amount: { $sum: '$amountPaisa' }, vat: { $sum: '$vatPaisa' } } },
    ]);
    const byStage = { CONTRACTED: 0, INVOICED: 0, RECEIVED: 0, SPENT: 0 };
    const bySource = {};
    let vatInvoiced = 0;
    let vatReceived = 0;
    for (const g of grouped) {
      byStage[g._id.stage] += g.amount;
      (bySource[g._id.source] ||= { CONTRACTED: 0, INVOICED: 0, RECEIVED: 0, SPENT: 0 })[g._id.stage] += g.amount;
      if (g._id.stage === 'INVOICED') vatInvoiced += g.vat;
      if (g._id.stage === 'RECEIVED') vatReceived += g.vat;
    }

    // Live position (not limited to the date range)
    const open = await Invoice.find({ status: { $in: OPEN_INVOICE } }).select('totalPaisa paidPaisa dueDate');
    const receivables = open.reduce(
      (a, i) => {
        const due = i.totalPaisa - i.paidPaisa;
        a.outstandingPaisa += due;
        if (i.dueDate && i.dueDate < new Date()) {
          a.overduePaisa += due;
          a.overdueCount += 1;
        }
        return a;
      },
      { outstandingPaisa: 0, overduePaisa: 0, overdueCount: 0, openCount: open.length }
    );
    const pipelineDeals = await SponsorshipDeal.find({ stage: { $in: ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'] } }).select('proposal.amount');
    const pipelineAds = await AdCampaign.find({ status: 'IN_REVIEW' }).select('pricingModel flatPrice budget');
    const projected = {
      sponsorshipPaisa: pipelineDeals.reduce((s, d) => s + toPaisa(d.proposal?.amount), 0),
      advertisingPaisa: pipelineAds.reduce((s, c) => s + toPaisa(c.pricingModel === 'FLAT' ? c.flatPrice : c.budget), 0),
      openDeals: pipelineDeals.length,
      adsInReview: pipelineAds.length,
    };
    const contractedAll = await sumPaisa({ stage: 'CONTRACTED' });
    const invoicedSubjects = await sumPaisa({ stage: 'INVOICED', $or: [{ deal: { $ne: null } }, { adCampaign: { $ne: null } }] });
    const directDealReceipts = await sumPaisa({ stage: 'RECEIVED', deal: { $ne: null }, invoice: null });

    // Last 12 months, by calendar month
    const since = new Date();
    since.setUTCMonth(since.getUTCMonth() - 11, 1);
    since.setUTCHours(0, 0, 0, 0);
    const monthly = await LedgerEntry.aggregate([
      { $match: { date: { $gte: since } } },
      { $group: { _id: { m: { $dateToString: { format: '%Y-%m', date: '$date', timezone: '+05:45' } }, stage: '$stage' }, amount: { $sum: '$amountPaisa' } } },
    ]);
    const months = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(since);
      d.setUTCMonth(since.getUTCMonth() + i);
      const key = d.toISOString().slice(0, 7);
      const row = { month: key, CONTRACTED: 0, INVOICED: 0, RECEIVED: 0, SPENT: 0 };
      monthly.filter((x) => x._id.m === key).forEach((x) => (row[x._id.stage] = x.amount));
      months.push(row);
    }

    const full = canRevenue(req.user);
    res.json({
      success: true,
      data: {
        range: { from: from || null, to: to || null, fiscalYear: fy },
        byStage,
        netPaisa: byStage.RECEIVED - byStage.SPENT,
        bySource: full ? bySource : undefined,
        vat: full ? { invoicedPaisa: vatInvoiced, receivedPaisa: vatReceived, registered: settings.vatRegistered, rate: settings.vatRate } : undefined,
        receivables,
        projected,
        // Contracted deals/campaigns not yet covered by an invoice (direct deal payments count as settled)
        uninvoicedPaisa: Math.max(0, contractedAll - invoicedSubjects - directDealReceipts),
        months,
        access: full ? 'FULL' : 'SUMMARY',
        notes: [
          'Amounts are before VAT. VAT is shown separately and is not income.',
          'Donations are kept in the donation ledger and are not included here.',
          'In-kind sponsorship (materials, transport, venues…) has an estimated value only and is never counted as cash.',
          'Projected income is the open pipeline: proposals under discussion and ads waiting for review.',
        ],
      },
    });
  } catch (error) {
    fail(res, 500, error.message);
  }
};

module.exports = {
  getSettings,
  updateSettings,
  listBillables,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  issueInvoice,
  voidInvoice,
  recordInvoicePayment,
  deleteInvoicePayment,
  listInvoices,
  myInvoices,
  getInvoice,
  listLedger,
  createManualEntry,
  reverseManualEntry,
  summary,
};
