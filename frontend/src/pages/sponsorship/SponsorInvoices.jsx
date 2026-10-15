import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ReceiptText } from 'lucide-react';
import API from '../../services/api';
import { BackLink, fmtDate } from '../../components/sponsorship/shared';
import { InvoiceChip, OverdueChip, OPEN_INVOICE, kindLabel, rs, subjectLine } from '../../components/revenue/revenueShared';

/**
 * /sponsor/invoices — issued, paid and void invoices of every sponsor account
 * I belong to (GET /revenue/invoices/mine; drafts are never returned).
 */
const SponsorInvoices = () => {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    API.get('/revenue/invoices/mine')
      .then((r) => setList(r.data.data || []))
      .catch((e) => {
        setList([]);
        setError(e?.response?.data?.message || 'Your invoices could not be loaded.');
      });
  }, []);

  const groups = useMemo(() => {
    const by = new Map();
    (list || []).forEach((inv) => {
      const key = inv.sponsorAccount?._id || 'none';
      if (!by.has(key)) by.set(key, { name: inv.sponsorAccount?.name || 'Sponsor account', items: [] });
      by.get(key).items.push(inv);
    });
    return [...by.values()].map((g) => ({
      ...g,
      due: g.items.filter((i) => OPEN_INVOICE.includes(i.status)).reduce((s, i) => s + (i.balancePaisa || 0), 0),
      overdue: g.items.filter((i) => i.overdue).length,
    }));
  }, [list]);

  return (
    <div className="pb-14">
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative space-y-3 pb-10 pt-8 animate-rise">
          <BackLink to="/sponsor/portal">Sponsor portal</BackLink>
          <span className="eyebrow deva block">बिल</span>
          <h1 className="text-4xl font-bold leading-[1.08] text-ink sm:text-5xl">Invoices</h1>
          <p className="max-w-2xl text-lg text-muted">Invoices for your sponsorships and ad campaigns, with what has been paid and what is still due. Open one to print or save it as a PDF.</p>
        </div>
      </section>

      <div className="container-page space-y-8 pt-8">
        {list === null ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading invoices">
            {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-paper-deep" />)}
          </div>
        ) : error ? (
          <p className="card p-6 text-sm text-brand">{error}</p>
        ) : groups.length === 0 ? (
          <div className="card mx-auto max-w-lg space-y-3 p-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-tint text-sky-ink"><ReceiptText className="h-7 w-7" aria-hidden="true" /></span>
            <h2 className="text-xl font-semibold text-ink">No invoices yet</h2>
            <p className="text-muted">When the Hateymalo team issues an invoice to one of your organisations it appears here, and you get a notification.</p>
          </div>
        ) : (
          groups.map((g) => (
            <section key={g.name} aria-label={g.name} className="space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold text-ink">{g.name}</h2>
                <p className="text-sm text-muted">
                  {g.due > 0 ? <>Still due <span className="font-semibold tabular-nums text-ink">{rs(g.due)}</span></> : 'Nothing due'}
                  {g.overdue > 0 && <span className="font-semibold text-brand"> · {g.overdue} overdue</span>}
                </p>
              </div>
              <ul className="space-y-3">
                {g.items.map((inv) => (
                  <li key={inv._id}>
                    <Link to={`/sponsor/invoices/${inv._id}`} className="card card-hover flex items-center gap-4 p-4 sm:p-5">
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <InvoiceChip status={inv.status} />
                          {inv.overdue && <OverdueChip />}
                          <span className="text-xs text-muted">{kindLabel(inv.kind)}</span>
                        </span>
                        <span className="block font-semibold tabular-nums text-ink">{inv.number}</span>
                        <span className="block text-sm text-muted">
                          {subjectLine(inv)} · issued {fmtDate(inv.issueDate)}{inv.dueDate ? ` · due ${fmtDate(inv.dueDate)}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-lg font-bold tabular-nums text-ink">{rs(inv.totalPaisa)}</span>
                        {OPEN_INVOICE.includes(inv.status) && <span className="block text-xs font-semibold tabular-nums text-brand">{rs(inv.balancePaisa)} due</span>}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default SponsorInvoices;
