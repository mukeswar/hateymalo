import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import API from '../../services/api';
import InvoiceDocument from '../../components/revenue/InvoiceDocument';
import { BackLink, NotFoundCard, PageSkeleton, fmtDate } from '../../components/sponsorship/shared';
import { InvoiceChip, METHOD_LABELS, OPEN_INVOICE, OverdueChip, kindLabel, rs } from '../../components/revenue/revenueShared';

/**
 * /sponsor/invoices/:id — one invoice for a member of the billed account:
 * where it stands, payments received, the document itself and a print link.
 */
const SponsorInvoice = () => {
  const { id } = useParams();
  const [inv, setInv] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setInv(null);
    setMissing(false);
    API.get(`/revenue/invoices/${id}`)
      .then((r) => setInv(r.data.data))
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) return <NotFoundCard title="Invoice not found" body="It may not be issued yet, or it belongs to an organisation you are not a member of." to="/sponsor/invoices" cta="All invoices" />;
  if (!inv) return <PageSkeleton label="Loading invoice" />;

  const open = OPEN_INVOICE.includes(inv.status);

  return (
    <div className="container-page space-y-6 pb-16 pt-8">
      <BackLink to="/sponsor/invoices">All invoices</BackLink>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <span className="eyebrow">{kindLabel(inv.kind)} · {inv.sponsorAccount?.name}</span>
          <h1 className="text-3xl font-bold tabular-nums text-ink sm:text-4xl">{inv.number}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <InvoiceChip status={inv.status} />
            {inv.overdue && <OverdueChip />}
          </div>
        </div>
        <Link to={`/invoices/${inv._id}/print`} className="btn btn-primary self-start sm:self-auto">
          <Printer className="h-4 w-4" aria-hidden="true" /> Print / Save as PDF
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-sm font-medium text-muted">Total</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{rs(inv.totalPaisa)}</p>
          {inv.kind === 'TAX_INVOICE' && <p className="mt-1 text-xs text-muted">Includes VAT {rs(inv.vatPaisa)} ({inv.vatRate}%)</p>}
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-muted">Paid</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-pine">{rs(inv.paidPaisa)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm font-medium text-muted">{inv.status === 'VOID' ? 'Status' : 'Balance due'}</p>
          {inv.status === 'VOID' ? (
            <p className="mt-1 font-display text-2xl font-bold text-brand">Void — do not pay</p>
          ) : (
            <p className={`mt-1 font-display text-2xl font-bold tabular-nums ${open && inv.balancePaisa > 0 ? 'text-brand' : 'text-ink'}`}>{rs(inv.balancePaisa)}</p>
          )}
          {open && inv.dueDate && <p className={`mt-1 text-xs font-semibold ${inv.overdue ? 'text-brand' : 'text-muted'}`}>{inv.overdue ? 'Was due' : 'Due'} {fmtDate(inv.dueDate)}</p>}
        </div>
      </div>

      {inv.status === 'VOID' && inv.voidReason && <p className="rounded-2xl bg-brand-tint p-4 text-sm text-brand"><strong>Voided:</strong> {inv.voidReason}</p>}

      <section className="card p-5" aria-labelledby="pay-h">
        <h2 id="pay-h" className="text-lg font-bold text-ink">Payments received</h2>
        {(inv.payments || []).length === 0 ? (
          <p className="mt-2 text-sm text-muted">No payments recorded on this invoice yet. Payments can take a few working days to be recorded after they reach our bank.</p>
        ) : (
          <ul className="mt-2 divide-y divide-sand">
            {inv.payments.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span>{fmtDate(p.receivedAt)} · {METHOD_LABELS[p.method] || p.method}{p.reference ? ` · ${p.reference}` : ''}</span>
                <span className="font-semibold tabular-nums text-ink">{rs(p.amountPaisa)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="overflow-hidden rounded-[var(--radius-card)] border border-sand shadow-[var(--shadow-soft)]">
        <InvoiceDocument inv={inv} showPayments={false} />
      </div>
    </div>
  );
};

export default SponsorInvoice;
