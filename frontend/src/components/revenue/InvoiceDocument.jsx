import React from 'react';
import { METHOD_LABELS, kindLabel, rs, subjectLine } from './revenueShared';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');

const Party = ({ title, p, fallbackName }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
    <p className="mt-1 font-semibold text-ink">{p?.name || fallbackName || '—'}</p>
    {p?.pan && (
      <p className="text-sm text-ink-soft">
        {p.vatRegistered ? 'VAT/PAN No.' : 'PAN No.'} <span className="font-semibold tabular-nums">{p.pan}</span>
      </p>
    )}
    {p?.address && <p className="whitespace-pre-line text-sm text-ink-soft">{p.address}</p>}
    {(p?.email || p?.phone) && <p className="text-sm text-ink-soft">{[p.email, p.phone].filter(Boolean).join(' · ')}</p>}
  </div>
);

/**
 * The invoice as a document (A4 sheet). Built only from the invoice JSON
 * returned by GET /revenue/invoices/:id — the same layout on screen, in the
 * sponsor portal and when printed / saved as PDF.
 */
const InvoiceDocument = ({ inv, showPayments = true }) => {
  const tax = inv.kind === 'TAX_INVOICE';
  const isVoid = inv.status === 'VOID';
  const isDraft = inv.status === 'DRAFT';
  const payments = inv.payments || [];
  return (
    <article className="invoice-sheet relative mx-auto w-full max-w-[210mm] overflow-hidden bg-white p-6 text-ink sm:p-10" aria-label={`${kindLabel(inv.kind)} ${inv.number || 'draft'}`}>
      {(isVoid || isDraft) && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span
            className={`-rotate-[24deg] select-none rounded-2xl border-[6px] px-8 py-2 font-display text-7xl font-bold tracking-[0.2em] sm:text-8xl ${
              isVoid ? 'border-brand/50 text-brand/40' : 'border-ink/15 text-ink/15'
            }`}
          >
            {isVoid ? 'VOID' : 'DRAFT'}
          </span>
        </div>
      )}

      <header className="flex flex-col-reverse gap-6 border-b-2 border-ink pb-6 sm:flex-row sm:items-start sm:justify-between">
        <Party title="From" p={inv.seller} fallbackName={isDraft ? 'Seller details are added when the invoice is issued' : ''} />
        <div className="sm:text-right">
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide text-ink sm:text-4xl">{tax ? 'Tax invoice' : 'Invoice'}</h1>
          <dl className="mt-2 space-y-0.5 text-sm">
            <div className="flex gap-2 sm:justify-end"><dt className="text-muted">Number</dt><dd className="font-semibold tabular-nums">{inv.number || 'Draft — not issued'}</dd></div>
            <div className="flex gap-2 sm:justify-end"><dt className="text-muted">Issue date</dt><dd className="font-semibold">{fmt(inv.issueDate)}</dd></div>
            <div className="flex gap-2 sm:justify-end"><dt className="text-muted">Due date</dt><dd className="font-semibold">{fmt(inv.dueDate)}</dd></div>
            {inv.fiscalYear && <div className="flex gap-2 sm:justify-end"><dt className="text-muted">Fiscal year</dt><dd className="font-semibold tabular-nums">{inv.fiscalYear}</dd></div>}
          </dl>
        </div>
      </header>

      {isVoid && (
        <p className="mt-5 rounded-xl border-2 border-brand bg-brand-tint px-4 py-3 text-sm font-semibold text-brand">
          This invoice is VOID and must not be paid.{inv.voidReason ? ` Reason: ${inv.voidReason}` : ''}
        </p>
      )}

      <section className="mt-6 grid gap-6 sm:grid-cols-2">
        <Party title="Bill to" p={inv.billTo?.name ? inv.billTo : null} fallbackName={inv.sponsorAccount?.name} />
        <div className="min-w-0 sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">For</p>
          <p className="mt-1 text-sm text-ink-soft">{subjectLine(inv)}</p>
        </div>
      </section>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[30rem] text-left text-sm">
          <thead>
            <tr className="border-b border-ink text-[11px] uppercase tracking-wider text-muted">
              <th scope="col" className="py-2 pr-2 font-bold">#</th>
              <th scope="col" className="py-2 pr-2 font-bold">Description</th>
              <th scope="col" className="py-2 pr-2 text-right font-bold">Qty</th>
              <th scope="col" className="py-2 pr-2 text-right font-bold">Unit price</th>
              <th scope="col" className="py-2 text-right font-bold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {(inv.lines || []).map((l, i) => (
              <tr key={l._id || i} className="border-b border-sand align-top">
                <td className="py-2.5 pr-2 tabular-nums text-muted">{i + 1}</td>
                <td className="py-2.5 pr-2 text-ink">{l.description}</td>
                <td className="py-2.5 pr-2 text-right tabular-nums">{Number(l.quantity).toLocaleString('en-IN')}</td>
                <td className="whitespace-nowrap py-2.5 pr-2 text-right tabular-nums">{rs(l.unitPricePaisa)}</td>
                <td className="whitespace-nowrap py-2.5 text-right font-semibold tabular-nums">{rs(l.amountPaisa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{rs(inv.subtotalPaisa)}</dd></div>
          {tax && <div className="flex justify-between gap-4"><dt className="text-ink-soft">VAT ({inv.vatRate}%)</dt><dd className="tabular-nums">{rs(inv.vatPaisa)}</dd></div>}
          <div className="flex justify-between gap-4 border-t-2 border-ink pt-1.5 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{rs(inv.totalPaisa)}</dd></div>
          {!isDraft && (
            <>
              <div className="flex justify-between gap-4"><dt className="text-ink-soft">Paid</dt><dd className="tabular-nums">{rs(inv.paidPaisa)}</dd></div>
              <div className="flex justify-between gap-4 font-bold"><dt>Balance due</dt><dd className="tabular-nums">{isVoid ? rs(0) : rs(inv.balancePaisa)}</dd></div>
            </>
          )}
        </dl>
      </div>

      {showPayments && payments.length > 0 && (
        <section className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Payments received</p>
          <ul className="mt-1.5 space-y-1 text-sm">
            {payments.map((p) => (
              <li key={p._id} className="flex flex-wrap justify-between gap-2 border-b border-sand py-1">
                <span>{fmt(p.receivedAt)} · {METHOD_LABELS[p.method] || p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                <span className="font-semibold tabular-nums">{rs(p.amountPaisa)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inv.notes && (
        <section className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Notes</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink-soft">{inv.notes}</p>
        </section>
      )}
      {inv.paymentInstructions && !isVoid && (
        <section className="mt-6 rounded-xl border border-sand p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted">How to pay</p>
          <p className="mt-1 whitespace-pre-line text-sm text-ink">{inv.paymentInstructions}</p>
        </section>
      )}
      {inv.footerNote && <p className="mt-8 border-t border-sand pt-4 text-center text-xs text-muted whitespace-pre-line">{inv.footerNote}</p>}
    </article>
  );
};

export default InvoiceDocument;
