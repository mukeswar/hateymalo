import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Info } from 'lucide-react';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { BTN_GHOST, Empty, Field, Loading, Panel, Stat, errMsg, fmtDate } from '../sponsorship/shared';
import { SOURCES, SOURCE_LABELS, STAGES, STAGE_INFO, rs, rsShort } from '../../../components/revenue/revenueShared';

const monthLabel = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
};

// Received vs spent per calendar month (last 12). The table below carries the same numbers for screen readers.
const MonthBars = ({ months }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...months.map((m) => Math.max(m.RECEIVED, m.SPENT)));
  const empty = months.every((m) => !m.RECEIVED && !m.SPENT);
  const h = hover !== null ? months[hover] : null;
  return (
    <figure className="card p-4 sm:p-5">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">Received vs spent, last 12 months</span>
        <span className="text-xs text-muted" aria-live="polite">
          {h ? `${monthLabel(h.month)} ${h.month.slice(0, 4)}: received ${rs(h.RECEIVED)} · spent ${rs(h.SPENT)}` : empty ? 'No money received or spent in the last 12 months' : `Peak ${rsShort(max)} · hover or tap a month`}
        </span>
      </figcaption>
      <div className="flex h-44 items-end gap-1 border-b border-sand sm:gap-2" aria-hidden="true" onMouseLeave={() => setHover(null)}>
        {months.map((m, i) => (
          <button key={m.month} type="button" tabIndex={-1} onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} className={`flex h-full min-w-0 flex-1 items-end justify-center gap-[2px] rounded-t-md ${hover === i ? 'bg-paper' : ''}`}>
            <span className="block w-1/2 max-w-4 rounded-t-[4px] bg-pine" style={{ height: `${m.RECEIVED > 0 ? Math.max(2, (m.RECEIVED / max) * 100) : 0}%` }} />
            <span className="block w-1/2 max-w-4 rounded-t-[4px] bg-brand" style={{ height: `${m.SPENT > 0 ? Math.max(2, (m.SPENT / max) * 100) : 0}%` }} />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1 text-[11px] text-muted sm:gap-2" aria-hidden="true">
        {months.map((m, i) => (
          <span key={m.month} className={`min-w-0 flex-1 truncate text-center ${i % 2 ? 'hidden sm:block' : ''}`}>{monthLabel(m.month)}</span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-pine" /> Received (before VAT)</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> Spent</span>
      </div>
      <table className="sr-only">
        <caption>Received and spent per month</caption>
        <thead><tr><th scope="col">Month</th><th scope="col">Received</th><th scope="col">Spent</th></tr></thead>
        <tbody>{months.map((m) => <tr key={m.month}><th scope="row">{m.month}</th><td>{rs(m.RECEIVED)}</td><td>{rs(m.SPENT)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
};

/**
 * Revenue dashboard (GET /revenue/summary). Finance sees everything; people
 * who run sponsorship or ads see the totals only (access: 'SUMMARY').
 * onOpenInvoices(focus) jumps to the invoices tab (finance only).
 */
const RevenueTab = ({ refreshKey = 0, onOpenInvoices }) => {
  const { can } = useAuth();
  const finance = can('canManageRevenue');
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));
      const res = await API.get('/revenue/summary', { params });
      setData(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not load the revenue summary'));
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const r = data?.range;
  const rangeText = r
    ? !range.from && !range.to
      ? `Fiscal year ${r.fiscalYear} · from ${fmtDate(r.from)} to today`
      : `${r.from ? fmtDate(r.from) : 'The beginning'} – ${r.to ? fmtDate(r.to) : 'today'}`
    : '';
  const sources = data?.bySource ? SOURCES.filter((s) => data.bySource[s]) : [];

  return (
    <div className="space-y-6">
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className="eyebrow">Revenue</p>
          <p className="mt-1 font-semibold text-ink">{rangeText || 'Loading…'}</p>
          <p className="text-xs text-muted">Stage totals cover this range. Receivables, pipeline and uninvoiced are live positions.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <Field id="rv-from" label="From">
            <input id="rv-from" type="date" className="field" value={range.from} max={range.to || undefined} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </Field>
          <Field id="rv-to" label="To">
            <input id="rv-to" type="date" className="field" value={range.to} min={range.from || undefined} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </Field>
          {(range.from || range.to) && (
            <button type="button" onClick={() => setRange({ from: '', to: '' })} className={BTN_GHOST}>This fiscal year</button>
          )}
        </div>
      </section>

      {error ? (
        <Empty icon={AlertTriangle} action={<button type="button" onClick={load} className={BTN_GHOST}>Try again</button>}>{error}</Empty>
      ) : !data ? (
        <Loading>Loading revenue…</Loading>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {STAGES.map((s) => (
              <Stat key={s} label={STAGE_INFO[s].label} value={rs(data.byStage[s])} hint={STAGE_INFO[s].hint} tone={s === 'RECEIVED' ? 'text-pine' : s === 'SPENT' ? 'text-brand' : 'text-ink'} />
            ))}
            <Stat label="Net (received − spent)" value={rs(data.netPaisa)} tone={data.netPaisa < 0 ? 'text-brand' : 'text-ink'} hint="Stages are never added together" />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <div className="card p-4 sm:p-5">
              <p className="text-sm font-medium text-muted">Receivables (incl. VAT)</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink">{rs(data.receivables.outstandingPaisa)}</p>
              <p className="mt-1 text-xs font-semibold text-muted">{data.receivables.openCount} open invoice{data.receivables.openCount === 1 ? '' : 's'}</p>
              <p className={`mt-2 text-sm font-semibold ${data.receivables.overdueCount ? 'text-brand' : 'text-muted'}`}>
                {data.receivables.overdueCount ? `${rs(data.receivables.overduePaisa)} overdue on ${data.receivables.overdueCount} invoice${data.receivables.overdueCount === 1 ? '' : 's'}` : 'Nothing overdue'}
              </p>
              {finance && onOpenInvoices && (
                <button type="button" onClick={() => onOpenInvoices(data.receivables.overdueCount ? { overdue: true } : {})} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-ink hover:underline">
                  {data.receivables.overdueCount ? 'See overdue invoices' : 'Open invoices'} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-sm font-medium text-muted">Projected (open pipeline)</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink">{rs(data.projected.sponsorshipPaisa + data.projected.advertisingPaisa)}</p>
              <ul className="mt-2 space-y-0.5 text-sm text-ink-soft">
                <li>Sponsorship {rs(data.projected.sponsorshipPaisa)} · {data.projected.openDeals} proposal{data.projected.openDeals === 1 ? '' : 's'} under discussion</li>
                <li>Advertising {rs(data.projected.advertisingPaisa)} · {data.projected.adsInReview} ad{data.projected.adsInReview === 1 ? '' : 's'} in review</li>
              </ul>
              <p className="mt-2 text-xs text-muted">Not income yet — not stored in the ledger.</p>
            </div>
            <div className="card p-4 sm:p-5">
              <p className="text-sm font-medium text-muted">Contracted, not yet invoiced</p>
              <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-ink">{rs(data.uninvoicedPaisa)}</p>
              <p className="mt-2 text-xs text-muted">Agreed deals and approved ads not covered by an invoice. Deal payments recorded directly count as settled.</p>
              {finance && onOpenInvoices && data.uninvoicedPaisa > 0 && (
                <button type="button" onClick={() => onOpenInvoices({})} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-sky-ink hover:underline">
                  Create invoices <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          <MonthBars months={data.months || []} />

          {data.access === 'FULL' && (
            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="By revenue stream" className="lg:col-span-2">
                {sources.length === 0 ? (
                  <Empty>No ledger rows in this range.</Empty>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[560px] text-left text-sm">
                      <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
                        <tr>
                          <th scope="col" className="px-4 py-3 font-semibold">Stream</th>
                          {STAGES.map((s) => <th key={s} scope="col" className="px-4 py-3 text-right font-semibold">{STAGE_INFO[s].label}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-sand">
                        {sources.map((src) => (
                          <tr key={src}>
                            <th scope="row" className="px-4 py-3 font-semibold text-ink">{SOURCE_LABELS[src]}</th>
                            {STAGES.map((s) => (
                              <td key={s} className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${data.bySource[src][s] ? 'text-ink' : 'text-muted'}`}>{rs(data.bySource[src][s])}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
              <section className="card p-4 sm:p-5">
                <h2 className="text-lg font-bold text-ink">VAT</h2>
                <p className="mt-1 text-sm text-muted">{data.vat.registered ? `VAT registered · ${data.vat.rate}% on tax invoices` : 'Not VAT registered — invoices carry no VAT'}</p>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><dt className="text-ink-soft">VAT invoiced</dt><dd className="font-semibold tabular-nums">{rs(data.vat.invoicedPaisa)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-soft">VAT received</dt><dd className="font-semibold tabular-nums">{rs(data.vat.receivedPaisa)}</dd></div>
                </dl>
                <p className="mt-3 text-xs text-muted">VAT is collected for the government and is not income. Treatment to be confirmed by your accountant.</p>
              </section>
            </div>
          )}

          {data.notes?.length > 0 && (
            <ul className="space-y-1.5 rounded-2xl bg-paper-deep/70 p-4 text-sm text-ink-soft">
              {data.notes.map((n) => (
                <li key={n} className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />{n}</li>
              ))}
              {data.access !== 'FULL' && <li className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />You see the totals only. Invoices, the ledger and the breakdown by stream are for finance staff.</li>}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default RevenueTab;
