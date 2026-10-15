import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Plus, ScrollText, Undo2 } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { BTN_DANGER, BTN_GHOST, BTN_PRIMARY, Empty, Field, Loading, Modal, NoteDialog, Panel, Select, errMsg, fmtDate } from '../sponsorship/shared';
import {
  METHOD_LABELS, PAYMENT_METHODS, SOURCES, SOURCE_LABELS, STAGES, STAGE_INFO, StageChip, downloadAuthed, rs, todayInput,
} from '../../../components/revenue/revenueShared';

const emptyEntry = () => ({ stage: 'RECEIVED', source: 'MEDIA_PRODUCTION', date: todayInput(), amount: '', description: '', sponsorAccount: '', method: 'BANK_TRANSFER', reference: '', note: '' });

/* Manual entry: other income received, or money spent on revenue work */
const EntryForm = ({ accounts, onClose, onSaved }) => {
  const { showToast } = useToast();
  const [f, setF] = useState(emptyEntry());
  const [saving, setSaving] = useState(false);
  const blocked = f.stage === 'RECEIVED' && ['SPONSORSHIP', 'ADVERTISING'].includes(f.source);
  const submit = async (e) => {
    e.preventDefault();
    if (f.stage === 'RECEIVED' && f.method !== 'CASH' && !f.reference.trim()) {
      showToast('Add the bank or transaction reference', 'error');
      return;
    }
    setSaving(true);
    try {
      const res = await API.post('/revenue/ledger', { ...f, amount: Number(f.amount), sponsorAccount: f.sponsorAccount || undefined });
      showToast(res.data.message || 'Entry added', 'success');
      onSaved(res.data.data);
    } catch (err) {
      showToast(errMsg(err, 'Could not add the entry'), 'error');
    } finally {
      setSaving(false);
    }
  };
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: typeof v === 'object' && v?.target ? v.target.value : v }));
  return (
    <Modal title="Add ledger entry" icon={Plus} onClose={onClose} size="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-muted">For other income and for costs. Sponsorship and advertising payments are recorded on the deal or the invoice, so they are never counted twice.</p>
        <div role="radiogroup" aria-label="Entry type" className="flex flex-wrap gap-2">
          {['RECEIVED', 'SPENT'].map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={f.stage === s}
              onClick={() => set('stage')(s)}
              className={`chip !px-4 !py-2 border ${f.stage === s ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
            >
              {s === 'RECEIVED' ? 'Money received' : 'Money spent'}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="le-source" label="Revenue stream">
            <Select id="le-source" value={f.source} onChange={set('source')} options={SOURCES} render={(s) => SOURCE_LABELS[s]} />
          </Field>
          <Field id="le-amount" label="Amount (NPR)">
            <input id="le-amount" required type="number" min="1" step="0.01" inputMode="decimal" className="field" value={f.amount} onChange={set('amount')} />
          </Field>
          <Field id="le-desc" label="Description" className="sm:col-span-2">
            <input id="le-desc" required maxLength={300} className="field" value={f.description} onChange={set('description')} placeholder={f.stage === 'SPENT' ? 'e.g. Printing of sponsor banners' : 'e.g. Video production for a partner'} />
          </Field>
          <Field id="le-date" label="Date">
            <input id="le-date" required type="date" max={todayInput()} className="field" value={f.date} onChange={set('date')} />
          </Field>
          <Field id="le-account" label="Sponsor account (optional)">
            <select id="le-account" className="field" value={f.sponsorAccount} onChange={set('sponsorAccount')}>
              <option value="">None</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </Field>
          <Field id="le-method" label="Method">
            <Select id="le-method" value={f.method} onChange={set('method')} options={PAYMENT_METHODS} render={(m) => METHOD_LABELS[m]} />
          </Field>
          <Field id="le-ref" label={f.stage === 'RECEIVED' && f.method !== 'CASH' ? 'Bank / transaction reference' : 'Reference (optional)'}>
            <input id="le-ref" required={f.stage === 'RECEIVED' && f.method !== 'CASH'} maxLength={120} className="field" value={f.reference} onChange={set('reference')} />
          </Field>
          <Field id="le-note" label="Note (optional)" className="sm:col-span-2">
            <input id="le-note" maxLength={500} className="field" value={f.note} onChange={set('note')} />
          </Field>
        </div>
        {blocked && <p className="text-sm font-semibold text-brand" role="alert">Record sponsorship and ad payments on the deal or invoice, not here.</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={saving || blocked} className="btn btn-primary">{saving ? 'Adding…' : 'Add entry'}</button>
        </div>
      </form>
    </Modal>
  );
};

/**
 * Revenue ledger for finance (canManageRevenue): every money event as its own
 * row, newest first (max 1000). Rows are never edited; corrections are
 * reversal rows. Manual rows can be reversed here; system rows follow their
 * deal, campaign or invoice.
 */
const LedgerTab = ({ search = '', refreshKey = 0 }) => {
  const { showToast } = useToast();
  const [rows, setRows] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', stage: '', source: '', sponsorAccount: '' });
  const [accounts, setAccounts] = useState([]);
  const [adding, setAdding] = useState(false);
  const [reversing, setReversing] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);

  const load = useCallback(async () => {
    try {
      const res = await API.get('/revenue/ledger', { params });
      setRows(res.data.data || []);
    } catch (e) {
      setRows([]);
      showToast(errMsg(e, 'Could not load the ledger'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    API.get('/sponsorship/admin/accounts').then((r) => setAccounts(r.data.data || [])).catch(() => setAccounts([]));
  }, []);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows || [];
    return (rows || []).filter((r) => [r.description, r.sponsorAccount?.name, r.invoice?.number, r.reference, r.note].some((s) => (s || '').toLowerCase().includes(q)));
  }, [rows, search]);

  // Per-stage totals of the rows shown (stages are never added together)
  const stageTotals = useMemo(() => {
    const t = Object.fromEntries(STAGES.map((s) => [s, 0]));
    shown.forEach((r) => {
      t[r.stage] += r.amountPaisa || 0;
    });
    return t;
  }, [shown]);

  const csv = async () => {
    setDownloading(true);
    try {
      await downloadAuthed(API, '/revenue/ledger', { ...params, format: 'csv' }, `hateymalo-revenue-ledger-${todayInput()}.csv`);
    } catch (e) {
      showToast('Could not download the CSV', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const reverse = async (reason) => {
    try {
      const res = await API.delete(`/revenue/ledger/${reversing._id}`, { params: { reason } });
      showToast(res.data.message || 'Entry reversed', 'success');
      setReversing(null);
      load();
    } catch (e) {
      showToast(errMsg(e, 'Could not reverse the entry'), 'error');
    }
  };

  const setF = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const anyFilter = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <Panel
        title="Revenue ledger"
        count={rows ? shown.length : undefined}
        description="Every money event is its own row. Corrections are reversal rows, never edits. Amounts are before VAT."
        actions={
          <>
            <button type="button" onClick={csv} disabled={downloading} className={BTN_GHOST}>
              <Download className="h-4 w-4" aria-hidden="true" /> {downloading ? 'Preparing…' : 'CSV'}
            </button>
            <button type="button" onClick={() => setAdding(true)} className={BTN_PRIMARY}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Add entry
            </button>
          </>
        }
      >
        <div className="grid gap-3 border-b border-sand p-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-5">
          <Field id="lg-from" label="From">
            <input id="lg-from" type="date" className="field" value={filters.from} max={filters.to || undefined} onChange={setF('from')} />
          </Field>
          <Field id="lg-to" label="To">
            <input id="lg-to" type="date" className="field" value={filters.to} min={filters.from || undefined} onChange={setF('to')} />
          </Field>
          <Field id="lg-stage" label="Stage">
            <select id="lg-stage" className="field" value={filters.stage} onChange={setF('stage')}>
              <option value="">All stages</option>
              {STAGES.map((s) => <option key={s} value={s}>{STAGE_INFO[s].label}</option>)}
            </select>
          </Field>
          <Field id="lg-source" label="Stream">
            <select id="lg-source" className="field" value={filters.source} onChange={setF('source')}>
              <option value="">All streams</option>
              {SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field id="lg-account" label="Sponsor">
            <select id="lg-account" className="field" value={filters.sponsorAccount} onChange={setF('sponsorAccount')}>
              <option value="">All sponsors</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </Field>
          {anyFilter && (
            <div className="sm:col-span-2 lg:col-span-5">
              <button type="button" onClick={() => setFilters({ from: '', to: '', stage: '', source: '', sponsorAccount: '' })} className="text-sm font-semibold text-sky-ink hover:underline">Clear filters</button>
            </div>
          )}
        </div>

        {rows && shown.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1 border-b border-sand px-4 py-3 text-sm sm:px-5">
            {STAGES.filter((s) => !filters.stage || filters.stage === s).map((s) => (
              <div key={s} className="flex gap-1.5">
                <dt className="text-muted">{STAGE_INFO[s].label}</dt>
                <dd className="font-semibold tabular-nums text-ink">{rs(stageTotals[s])}</dd>
              </div>
            ))}
            <div className="w-full text-xs text-muted">Totals of the rows shown, net of reversals.{rows.length >= 1000 ? ' Only the newest 1,000 rows are listed — narrow the dates or download the CSV.' : ''}</div>
          </dl>
        )}

        {rows === null ? (
          <Loading>Loading ledger…</Loading>
        ) : shown.length === 0 ? (
          <Empty icon={ScrollText}>{search || anyFilter ? 'No ledger rows match.' : 'The ledger is empty. Rows appear when deals are agreed, ads approved, invoices issued and payments recorded.'}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold">Description</th>
                  <th className="px-4 py-3 font-semibold">Method · ref.</th>
                  <th className="px-4 py-3 text-right font-semibold">Amount</th>
                  <th className="px-4 py-3 text-right font-semibold">VAT</th>
                  <th className="px-4 py-3 text-right font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {shown.map((r) => {
                  const isRev = !!r.reversalOf;
                  const muted = isRev || r.reversed;
                  return (
                    <tr key={r._id} className={`align-top hover:bg-paper ${muted ? 'text-muted' : ''}`}>
                      <td className="whitespace-nowrap px-4 py-3">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3">
                        <span className={muted ? 'opacity-60' : ''}><StageChip stage={r.stage} /></span>
                        <span className="block pt-1 text-xs text-muted">{SOURCE_LABELS[r.source] || r.source}</span>
                      </td>
                      <td className="max-w-[22rem] px-4 py-3">
                        <span className={`block ${muted ? '' : 'font-medium text-ink'}`}>
                          {isRev && <span className="mr-1.5 chip bg-paper-deep text-muted">Reversal</span>}
                          {r.reversed && !isRev && <span className="mr-1.5 chip bg-paper-deep text-muted">Reversed</span>}
                          {isRev ? r.description.replace(/^Reversal:\s*/, '') : r.description}
                        </span>
                        <span className="block text-xs text-muted">
                          {[r.sponsorAccount?.name, r.invoice?.number, r.origin === 'MANUAL' ? `manual · ${r.createdBy?.name || ''}` : 'system'].filter(Boolean).join(' · ')}
                        </span>
                        {r.note && <span className="block text-xs italic text-muted">{isRev ? 'Reason: ' : 'Note: '}{r.note}</span>}
                      </td>
                      <td className="px-4 py-3 text-xs">{r.method ? METHOD_LABELS[r.method] || r.method : '—'}{r.reference ? ` · ${r.reference}` : ''}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${muted ? '' : 'font-semibold text-ink'}`}>{rs(r.amountPaisa)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{r.vatPaisa ? rs(r.vatPaisa) : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        {r.origin === 'MANUAL' && !isRev && !r.reversed && (
                          <button type="button" onClick={() => setReversing(r)} className={BTN_DANGER}>
                            <Undo2 className="h-3.5 w-3.5" aria-hidden="true" /> Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {adding && (
        <EntryForm
          accounts={accounts}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            load();
          }}
        />
      )}
      {reversing && (
        <NoteDialog
          title="Reverse this entry?"
          message={`A reversal row of ${rs(-reversing.amountPaisa)} is added for “${reversing.description}”. The original stays in the ledger, marked reversed.`}
          fieldLabel="Reason (required)"
          confirmLabel="Reverse entry"
          required
          danger
          onCancel={() => setReversing(null)}
          onConfirm={reverse}
        />
      )}
    </div>
  );
};

export default LedgerTab;
