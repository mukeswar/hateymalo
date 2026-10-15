/* --------------------------------------------------------------------------
   Revenue ledger and invoices — vocabulary, money formatting and small pieces
   shared by the admin tabs, the sponsor invoice pages and the print view.
   Contract: docs/REVENUE.md. Money in responses is in PAISA (integers);
   inputs (amount, unitPrice) are sent in NPR. The server enforces every rule.
   -------------------------------------------------------------------------- */

export const STAGES = ['CONTRACTED', 'INVOICED', 'RECEIVED', 'SPENT'];
export const SOURCES = ['SPONSORSHIP', 'ADVERTISING', 'MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'];
// Sources an "other income" invoice may use (deals and ads set their own)
export const OTHER_SOURCES = ['MEDIA_PRODUCTION', 'CSR', 'MERCHANDISE', 'OTHER'];
export const INVOICE_STATUSES = ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID'];
export const OPEN_INVOICE = ['ISSUED', 'PARTIALLY_PAID'];
export const PAYMENT_METHODS = ['BANK_TRANSFER', 'CONNECTIPS', 'KHALTI', 'ESEWA', 'CHEQUE', 'CASH', 'OTHER'];

export const STAGE_INFO = {
  CONTRACTED: { label: 'Contracted', hint: 'Deals agreed and ads approved', cls: 'bg-sky-tint text-sky-ink' },
  INVOICED: { label: 'Invoiced', hint: 'Issued invoices, before VAT', cls: 'bg-marigold-tint text-marigold-text' },
  RECEIVED: { label: 'Received', hint: 'Money in the bank, before VAT', cls: 'bg-pine-tint text-pine' },
  SPENT: { label: 'Spent', hint: 'Costs of revenue work', cls: 'bg-brand-tint text-brand' },
};

export const SOURCE_LABELS = {
  SPONSORSHIP: 'Sponsorship',
  ADVERTISING: 'Advertising',
  MEDIA_PRODUCTION: 'Media production',
  CSR: 'CSR',
  MERCHANDISE: 'Merchandise',
  OTHER: 'Other',
};

export const METHOD_LABELS = {
  BANK_TRANSFER: 'Bank transfer',
  CONNECTIPS: 'connectIPS',
  KHALTI: 'Khalti',
  ESEWA: 'eSewa',
  CHEQUE: 'Cheque',
  CASH: 'Cash',
  OTHER: 'Other',
};

export const INVOICE_STATUS = {
  DRAFT: { label: 'Draft', cls: 'bg-paper-deep text-ink-soft' },
  ISSUED: { label: 'Issued', cls: 'bg-sky-tint text-sky-ink' },
  PARTIALLY_PAID: { label: 'Part paid', cls: 'bg-marigold-tint text-marigold-text' },
  PAID: { label: 'Paid', cls: 'bg-pine-tint text-pine' },
  VOID: { label: 'Void', cls: 'bg-brand-tint text-brand' },
};

export const SUBJECT_LABELS = { SPONSORSHIP_DEAL: 'Sponsorship deal', AD_CAMPAIGN: 'Ad campaign', OTHER: 'Other income' };

export const InvoiceChip = ({ status, className = '' }) => {
  const s = INVOICE_STATUS[status] || { label: status, cls: 'bg-paper-deep text-ink-soft' };
  return <span className={`chip ${s.cls} ${className}`}>{s.label}</span>;
};
export const OverdueChip = () => <span className="chip bg-brand text-white">Overdue</span>;
export const StageChip = ({ stage }) => {
  const s = STAGE_INFO[stage] || { label: stage, cls: 'bg-paper-deep text-ink-soft' };
  return <span className={`chip ${s.cls}`}>{s.label}</span>;
};

// Paisa → "Rs. 1,23,456.00" (always two decimals; minus sign in front)
export const rs = (paisa) => {
  const n = Number(paisa) || 0;
  const s = (Math.abs(n) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '−' : ''}Rs. ${s}`;
};
// Short form for chart labels: Rs. 1.2L / Rs. 3.4K
export const rsShort = (paisa) => {
  const n = (Number(paisa) || 0) / 100;
  const a = Math.abs(n);
  const fmt = (v, u) => `Rs. ${v.toLocaleString('en-IN', { maximumFractionDigits: 1 })}${u}`;
  if (a >= 1e7) return fmt(n / 1e7, 'Cr');
  if (a >= 1e5) return fmt(n / 1e5, 'L');
  if (a >= 1e3) return fmt(n / 1e3, 'K');
  return fmt(n, '');
};
// Paisa → NPR number for an input field ("1234.5")
export const toNprInput = (paisa) => (paisa ? String(Math.round(paisa) / 100) : '');

export const invoiceTitle = (inv) => (inv?.number ? inv.number : 'Draft');
export const kindLabel = (kind) => (kind === 'TAX_INVOICE' ? 'Tax invoice' : 'Invoice');

// What the invoice bills, in words
export const subjectLine = (inv) => {
  if (!inv) return '';
  if (inv.subjectType === 'SPONSORSHIP_DEAL') return `Sponsorship${inv.deal?.opportunity?.title ? ` · ${inv.deal.opportunity.title}` : ''}`;
  if (inv.subjectType === 'AD_CAMPAIGN') return `Ad campaign${inv.adCampaign?.title ? ` · ${inv.adCampaign.title}` : ''}`;
  return `Other income · ${SOURCE_LABELS[inv.source] || inv.source || ''}`;
};

/**
 * Same totals rule as the server (revenueController computeTotals/parseLines):
 * unit price in NPR → paisa, quantity rounded to 2 decimals, VAT only when the
 * billing profile is VAT registered. Used for the live preview only.
 */
export const previewTotals = (lines, settings) => {
  const rows = (lines || []).map((l) => {
    const unit = Math.round((Number(l.unitPrice) || 0) * 100);
    const qty = Math.round(Number(l.quantity === '' || l.quantity === undefined ? 1 : l.quantity) * 100) / 100 || 0;
    return { unitPricePaisa: Math.max(0, unit), quantity: qty, amountPaisa: Math.round(Math.max(0, unit) * qty) };
  });
  const subtotalPaisa = rows.reduce((s, r) => s + r.amountPaisa, 0);
  const vatRegistered = !!settings?.vatRegistered;
  const vatRate = vatRegistered ? Number(settings?.vatRate) || 0 : 0;
  const vatPaisa = Math.round((subtotalPaisa * vatRate) / 100);
  return { rows, subtotalPaisa, vatRate, vatPaisa, totalPaisa: subtotalPaisa + vatPaisa, kind: vatRegistered ? 'TAX_INVOICE' : 'INVOICE' };
};

// Fetch with the auth header (the axios instance adds it) → blob → download
export const downloadAuthed = async (API, url, params, fallbackName) => {
  const res = await API.get(url, { params, responseType: 'blob' });
  const cd = res.headers?.['content-disposition'] || '';
  const name = /filename="([^"]+)"/.exec(cd)?.[1] || fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1500);
};

export const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
