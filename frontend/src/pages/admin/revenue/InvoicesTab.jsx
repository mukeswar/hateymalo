import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Landmark, Plus, ReceiptText } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import InvoiceDrawer from './InvoiceDrawer';
import InvoiceForm from './InvoiceForm';
import BillingProfile from './BillingProfile';
import { BTN_GHOST, BTN_PRIMARY, Empty, Loading, Panel, Stat, errMsg, fmtDate } from '../sponsorship/shared';
import { INVOICE_STATUS, InvoiceChip, OPEN_INVOICE, OverdueChip, kindLabel, rs, subjectLine } from '../../../components/revenue/revenueShared';

const STATUS_FILTERS = [
  { id: '', label: 'All statuses' },
  { id: 'ISSUED,PARTIALLY_PAID', label: 'Open (unpaid or part paid)' },
  ...Object.entries(INVOICE_STATUS).map(([id, s]) => ({ id, label: s.label })),
];

/**
 * Invoices for finance (canManageRevenue): billing profile, filters, list,
 * "New invoice" and the invoice drawer.
 * focus = { invoice?, overdue?, nonce } from deep links (/admin?tab=invoices&invoice=<id>)
 * and from the revenue dashboard.
 */
const InvoicesTab = ({ focus = null, onFocusHandled, search = '', refreshKey = 0 }) => {
  const { showToast } = useToast();
  const [list, setList] = useState(null);
  const [status, setStatus] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [account, setAccount] = useState('');
  const [fiscalYear, setFiscalYear] = useState('');
  const [years, setYears] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [settings, setSettings] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!focus) return;
    if (focus.invoice) setOpenId(focus.invoice);
    if (focus.overdue) {
      setOverdue(true);
      setStatus('');
    }
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const loadSettings = useCallback(() => {
    API.get('/revenue/settings').then((r) => setSettings(r.data.data)).catch(() => setSettings(false));
  }, []);

  const load = useCallback(async () => {
    try {
      const params = {};
      if (status) params.status = status;
      if (overdue) params.overdue = 'true';
      if (account) params.sponsorAccount = account;
      if (fiscalYear) params.fiscalYear = fiscalYear;
      const res = await API.get('/revenue/invoices', { params });
      const rows = res.data.data || [];
      setList(rows);
      // Remember every fiscal year seen so the filter keeps its options
      setYears((ys) => [...new Set([...ys, ...rows.map((i) => i.fiscalYear).filter(Boolean)])].sort().reverse());
    } catch (e) {
      setList([]);
      showToast(errMsg(e, 'Could not load invoices'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, overdue, account, fiscalYear]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    loadSettings();
    API.get('/sponsorship/admin/accounts').then((r) => setAccounts(r.data.data || [])).catch(() => setAccounts([]));
  }, [loadSettings, refreshKey]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list || [];
    return (list || []).filter((i) =>
      [i.number, i.sponsorAccount?.name, subjectLine(i), ...(i.lines || []).map((l) => l.description)].some((s) => (s || '').toLowerCase().includes(q))
    );
  }, [list, search]);

  const totals = useMemo(() => {
    const open = shown.filter((i) => OPEN_INVOICE.includes(i.status));
    return {
      open: open.length,
      outstanding: open.reduce((s, i) => s + (i.balancePaisa || 0), 0),
      overdue: open.filter((i) => i.overdue).length,
      overdueAmount: open.filter((i) => i.overdue).reduce((s, i) => s + (i.balancePaisa || 0), 0),
      drafts: shown.filter((i) => i.status === 'DRAFT').length,
    };
  }, [shown]);

  const profileMissing = settings && (!settings.sellerName || !settings.sellerAddress);
  const filtered = status || overdue || account || fiscalYear;

  return (
    <div className="space-y-6">
      {/* Billing profile summary */}
      <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pine-tint text-pine"><Landmark className="h-5 w-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-semibold text-ink">Billing profile</p>
            {settings === null ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : settings === false ? (
              <p className="text-sm text-brand">Could not load the billing profile.</p>
            ) : (
              <p className="text-sm text-muted">
                {settings.sellerName || 'No seller name'} · {settings.vatRegistered ? `VAT registered (${settings.vatRate}%) — tax invoices` : 'Not VAT registered — invoices without VAT'}
                {settings.sellerPan ? ` · PAN ${settings.sellerPan}` : ''} · numbers {settings.invoicePrefix}-…
              </p>
            )}
            {profileMissing && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-brand"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Add the seller name and address before issuing invoices.</p>
            )}
          </div>
        </div>
        <button type="button" onClick={() => setProfileOpen(true)} className={`${BTN_GHOST} self-start sm:self-auto`}>Edit billing profile</button>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open invoices" value={totals.open} hint={filtered || search ? 'In this view' : 'Issued or part paid'} />
        <Stat label="Outstanding" value={rs(totals.outstanding)} hint="Balance still due, incl. VAT" />
        <Stat
          label="Overdue"
          value={totals.overdue}
          tone={totals.overdue ? 'text-brand' : 'text-ink'}
          hint={totals.overdue ? `${rs(totals.overdueAmount)} past the due date` : 'Nothing past due'}
          onClick={() => { setOverdue(true); setStatus(''); }}
        />
        <Stat label="Drafts" value={totals.drafts} hint="Not issued, only finance sees them" onClick={() => { setStatus('DRAFT'); setOverdue(false); }} />
      </div>

      <Panel
        title="Invoices"
        count={list ? shown.length : undefined}
        description="Issued invoices are locked. Fix a mistake by voiding it and issuing a new one."
        actions={
          <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New invoice
          </button>
        }
      >
        <div className="grid gap-3 border-b border-sand p-4 sm:grid-cols-2 lg:grid-cols-4 sm:px-5">
          <div>
            <label htmlFor="inv-f-status" className="field-label">Status</label>
            <select id="inv-f-status" className="field" value={status} onChange={(e) => setStatus(e.target.value)} disabled={overdue}>
              {STATUS_FILTERS.map((f) => <option key={f.id || 'all'} value={f.id}>{f.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inv-f-account" className="field-label">Sponsor</label>
            <select id="inv-f-account" className="field" value={account} onChange={(e) => setAccount(e.target.value)}>
              <option value="">All sponsors</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="inv-f-fy" className="field-label">Fiscal year</label>
            <select id="inv-f-fy" className="field" value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)}>
              <option value="">All years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <label htmlFor="inv-f-overdue" className="flex min-h-11 cursor-pointer items-center gap-3 self-end rounded-xl border border-sand px-3">
            <input id="inv-f-overdue" type="checkbox" checked={overdue} onChange={(e) => setOverdue(e.target.checked)} className="h-5 w-5 accent-[#B5232C]" />
            <span className="text-sm font-semibold text-ink">Overdue only</span>
          </label>
        </div>

        {list === null ? (
          <Loading>Loading invoices…</Loading>
        ) : shown.length === 0 ? (
          <Empty
            icon={ReceiptText}
            action={!filtered && !search ? <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> New invoice</button> : null}
          >
            {search ? 'No invoices match your search.' : filtered ? 'No invoices match these filters.' : 'No invoices yet.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice</th>
                  <th className="px-4 py-3 font-semibold">Sponsor · for</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Issued</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                  <th className="px-4 py-3 text-right font-semibold">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {shown.map((i) => (
                  <tr key={i._id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => setOpenId(i._id)} className="text-left font-semibold tabular-nums text-ink hover:text-brand hover:underline">
                        {i.number || 'Draft'}
                      </button>
                      <span className="block text-xs text-muted">{kindLabel(i.kind)}</span>
                    </td>
                    <td className="max-w-[18rem] px-4 py-3">
                      <span className="block font-medium text-ink">{i.sponsorAccount?.name}</span>
                      <span className="block truncate text-xs text-muted">{subjectLine(i)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap gap-1.5"><InvoiceChip status={i.status} />{i.overdue && <OverdueChip />}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{i.issueDate ? fmtDate(i.issueDate) : '—'}</td>
                    <td className={`whitespace-nowrap px-4 py-3 ${i.overdue ? 'font-semibold text-brand' : 'text-ink-soft'}`}>{i.dueDate ? fmtDate(i.dueDate) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{rs(i.totalPaisa)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">{OPEN_INVOICE.includes(i.status) ? rs(i.balancePaisa) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {openId && (
        <InvoiceDrawer
          invoiceId={openId}
          onClose={() => {
            setOpenId(null);
            load();
          }}
          onChanged={(d) => setList((rows) => (rows || []).map((x) => (x._id === d._id ? { ...x, ...d } : x)))}
          onDeleted={(id) => setList((rows) => (rows || []).filter((x) => x._id !== id))}
        />
      )}
      {creating && (
        <InvoiceForm
          onClose={() => setCreating(false)}
          onSaved={(d) => {
            setCreating(false);
            setList((rows) => [d, ...(rows || [])]);
            setOpenId(d._id);
          }}
        />
      )}
      {profileOpen && <BillingProfile onClose={() => setProfileOpen(false)} onSaved={setSettings} />}
    </div>
  );
};

export default InvoicesTab;
