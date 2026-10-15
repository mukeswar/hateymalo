import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Plus, ReceiptText, Trash2 } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import { BTN_GHOST, Field, ICON_BTN, Loading, Modal, Select, errMsg, label, toDateInput } from '../sponsorship/shared';
import { OTHER_SOURCES, SOURCE_LABELS, previewTotals, rs, toNprInput } from '../../../components/revenue/revenueShared';

const emptyLine = () => ({ description: '', quantity: '1', unitPrice: '' });

/**
 * New invoice (draft) or edit a draft.
 *   invoice  — an existing DRAFT to edit (subject and sponsor are fixed)
 *   preset   — { sponsorAccount, subjectType, deal?, adCampaign? } to start from (deal / campaign drawers)
 * Totals are previewed with the server's rule; the server recomputes them on save and again on issue.
 */
const InvoiceForm = ({ invoice = null, preset = null, onClose, onSaved }) => {
  const { showToast } = useToast();
  const editing = !!invoice;
  const [accounts, setAccounts] = useState(null);
  const [accountsError, setAccountsError] = useState('');
  const [settings, setSettings] = useState(null);
  const [account, setAccount] = useState(invoice?.sponsorAccount?._id || preset?.sponsorAccount || '');
  const [billables, setBillables] = useState(null);
  // subject key: 'deal:<id>' | 'ad:<id>' | 'other'
  const [subject, setSubject] = useState(() => {
    const s = invoice || preset;
    if (!s) return '';
    if (s.subjectType === 'SPONSORSHIP_DEAL') return `deal:${s.deal?._id || s.deal}`;
    if (s.subjectType === 'AD_CAMPAIGN') return `ad:${s.adCampaign?._id || s.adCampaign}`;
    return s.subjectType === 'OTHER' ? 'other' : '';
  });
  const [source, setSource] = useState(invoice?.subjectType === 'OTHER' ? invoice.source : 'OTHER');
  const [lines, setLines] = useState(
    invoice ? invoice.lines.map((l) => ({ description: l.description, quantity: String(l.quantity), unitPrice: toNprInput(l.unitPricePaisa) })) : [emptyLine()]
  );
  const [dueDate, setDueDate] = useState(invoice?.dueDate ? toDateInput(invoice.dueDate) : '');
  const [notes, setNotes] = useState(invoice?.notes || '');
  const [saving, setSaving] = useState(false);
  const [prefilled, setPrefilled] = useState(editing);

  useEffect(() => {
    API.get('/revenue/settings').then((r) => setSettings(r.data.data)).catch(() => setSettings(false));
    if (editing) return;
    API.get('/sponsorship/admin/accounts')
      .then((r) => setAccounts(r.data.data || []))
      .catch((e) => {
        setAccounts([]);
        setAccountsError(errMsg(e, 'Sponsor accounts could not be loaded'));
      });
  }, [editing]);

  useEffect(() => {
    if (!account || editing) return;
    setBillables(null);
    API.get('/revenue/billables', { params: { sponsorAccount: account } })
      .then((r) => setBillables(r.data.data))
      .catch((e) => {
        setBillables({ deals: [], adCampaigns: [] });
        showToast(errMsg(e, 'Could not load what can be invoiced'), 'error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, editing]);

  const chosen = useMemo(() => {
    if (!billables || !subject || subject === 'other') return null;
    const [kind, id] = subject.split(':');
    const item = (kind === 'deal' ? billables.deals : billables.adCampaigns).find((x) => x._id === id);
    return item ? { kind, ...item } : null;
  }, [billables, subject]);

  // Prefill one line with what is left to bill when a deal / campaign is chosen
  useEffect(() => {
    if (!chosen || prefilled) return;
    const desc = chosen.kind === 'deal' ? `Sponsorship — ${chosen.title}${chosen.tier ? ` (${chosen.tier})` : ''}` : `Advertising — ${chosen.title}`;
    setLines([{ description: desc, quantity: '1', unitPrice: toNprInput(chosen.remainingPaisa) }]);
    setPrefilled(true);
  }, [chosen, prefilled]);

  const pickSubject = (key) => {
    setSubject(key);
    setPrefilled(key === 'other');
    if (key === 'other') setLines([emptyLine()]);
  };

  const totals = previewTotals(lines, settings);
  const position = editing ? invoice.billing : chosen;
  const over = !!position && typeof position.remainingPaisa === 'number' && totals.subtotalPaisa > position.remainingPaisa;

  const setLine = (i, patch) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async (e) => {
    e.preventDefault();
    if (!editing && (!account || !subject)) {
      showToast('Choose the sponsor account and what the invoice is for', 'error');
      return;
    }
    const body = {
      lines: lines.map((l) => ({ description: l.description.trim(), quantity: Number(l.quantity || 1), unitPrice: Number(l.unitPrice || 0) })),
      dueDate: dueDate || null,
      notes,
    };
    setSaving(true);
    try {
      let res;
      if (editing) {
        if (invoice.subjectType === 'OTHER') body.source = source;
        res = await API.put(`/revenue/invoices/${invoice._id}`, body);
      } else {
        const [kind, id] = subject.split(':');
        Object.assign(body, {
          sponsorAccount: account,
          subjectType: kind === 'deal' ? 'SPONSORSHIP_DEAL' : kind === 'ad' ? 'AD_CAMPAIGN' : 'OTHER',
          ...(kind === 'deal' ? { deal: id } : kind === 'ad' ? { adCampaign: id } : { source }),
        });
        res = await API.post('/revenue/invoices', body);
      }
      showToast(res.data.message || 'Draft saved', 'success');
      onSaved?.(res.data.data);
    } catch (err) {
      showToast(errMsg(err, 'Could not save the invoice'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const accountName = invoice?.sponsorAccount?.name || accounts?.find((a) => a._id === account)?.name;

  return (
    <Modal title={editing ? 'Edit draft invoice' : 'New invoice'} icon={ReceiptText} onClose={onClose} size="max-w-3xl">
      <form onSubmit={submit} className="space-y-5">
        {/* 1. Who */}
        {editing || preset ? (
          <p className="text-sm text-ink-soft">
            Bill to <strong className="text-ink">{accountName || 'the sponsor account'}</strong>
          </p>
        ) : accounts === null ? (
          <Loading>Loading sponsor accounts…</Loading>
        ) : (
          <Field id="inv-account" label="Bill to (sponsor account)" hint={accountsError || 'Name, PAN and address on the invoice come from this account when it is issued.'}>
            <select id="inv-account" className="field" value={account} onChange={(e) => { setAccount(e.target.value); setSubject(''); setPrefilled(false); }} required>
              <option value="">Choose an account…</option>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>
                  {a.name}{a.verificationStatus !== 'VERIFIED' ? ` (${label(a.verificationStatus).toLowerCase()})` : ''}
                </option>
              ))}
            </select>
          </Field>
        )}

        {/* 2. What */}
        {editing ? (
          <p className="text-sm text-ink-soft">
            For <strong className="text-ink">{invoice.subjectType === 'SPONSORSHIP_DEAL' ? `sponsorship${invoice.deal?.opportunity?.title ? ` · ${invoice.deal.opportunity.title}` : ''}` : invoice.subjectType === 'AD_CAMPAIGN' ? `ad campaign · ${invoice.adCampaign?.title || ''}` : 'other income'}</strong>
          </p>
        ) : account ? (
          billables === null ? (
            <Loading>Checking what can be invoiced…</Loading>
          ) : (
            <fieldset className="space-y-2">
              <legend className="field-label">What is this invoice for?</legend>
              {[
                ...billables.deals.map((d) => ({ key: `deal:${d._id}`, title: d.title, meta: `Sponsorship deal${d.tier ? ` · ${d.tier}` : ''} · ${label(d.stage)}`, pos: d })),
                ...billables.adCampaigns.map((c) => ({ key: `ad:${c._id}`, title: c.title, meta: `Ad campaign · ${label(c.pricingModel)} · ${label(c.status)}`, pos: c })),
                { key: 'other', title: 'Other income', meta: 'Media production, CSR, merchandise or other work — no contract limit' },
              ].map((o) => (
                <label key={o.key} htmlFor={`subj-${o.key}`} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 hover:bg-paper ${subject === o.key ? 'border-ink bg-paper' : 'border-sand'}`}>
                  <input id={`subj-${o.key}`} type="radio" name="inv-subject" checked={subject === o.key} onChange={() => pickSubject(o.key)} className="mt-1 h-4 w-4 accent-[#B5232C]" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">{o.title}</span>
                    <span className="block text-xs text-muted">{o.meta}</span>
                    {o.pos && (
                      <span className="mt-1 block text-xs tabular-nums text-ink-soft">
                        Contracted {rs(o.pos.contractedPaisa)} · invoiced {rs(o.pos.invoicedPaisa)} · <strong className={o.pos.remainingPaisa ? 'text-pine' : 'text-muted'}>{rs(o.pos.remainingPaisa)} left</strong>
                      </span>
                    )}
                  </span>
                </label>
              ))}
              {billables.deals.length === 0 && billables.adCampaigns.length === 0 && (
                <p className="text-xs text-muted">This account has no agreed deals or approved priced ad campaigns, so only other income can be invoiced.</p>
              )}
            </fieldset>
          )
        ) : null}

        {(subject === 'other' || (editing && invoice.subjectType === 'OTHER')) && (
          <Field id="inv-source" label="Revenue stream">
            <Select id="inv-source" value={source} onChange={setSource} options={OTHER_SOURCES} render={(s) => SOURCE_LABELS[s]} />
          </Field>
        )}

        {/* 3. Lines */}
        {(subject || editing) && (
          <>
            <fieldset className="space-y-3">
              <legend className="field-label">Lines (prices in NPR, before VAT)</legend>
              {lines.map((l, i) => {
                const amount = totals.rows[i]?.amountPaisa || 0;
                return (
                  <div key={i} className="grid grid-cols-6 items-end gap-2 rounded-xl border border-sand p-3 sm:grid-cols-12">
                    <Field id={`ln-d-${i}`} label="Description" className="col-span-6 sm:col-span-6">
                      <input id={`ln-d-${i}`} className="field" required maxLength={300} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                    </Field>
                    <Field id={`ln-q-${i}`} label="Qty" className="col-span-2 sm:col-span-1">
                      <input id={`ln-q-${i}`} className="field" type="number" min="0.01" step="0.01" inputMode="decimal" required value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    </Field>
                    <Field id={`ln-p-${i}`} label="Unit price" className="col-span-4 sm:col-span-2">
                      <input id={`ln-p-${i}`} className="field" type="number" min="0" step="0.01" inputMode="decimal" required value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                    </Field>
                    <div className="col-span-5 sm:col-span-2">
                      <p className="field-label">Amount</p>
                      <p className="py-2 text-right font-semibold tabular-nums text-ink">{rs(amount)}</p>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <button type="button" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1} className={ICON_BTN} aria-label={`Remove line ${i + 1}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {lines.length < 30 && (
                <button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className={BTN_GHOST}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Add line
                </button>
              )}
            </fieldset>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="inv-due" label="Due date (optional)" hint={settings ? `Left empty, it is set to ${settings.defaultDueDays} days after the issue date.` : undefined}>
                <input id="inv-due" type="date" className="field" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </Field>
              <Field id="inv-notes" label="Notes on the invoice (optional)">
                <textarea id="inv-notes" rows={2} maxLength={2000} className="field" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </Field>
            </div>

            {/* Live totals */}
            <div className="rounded-2xl bg-paper p-4">
              <dl className="ml-auto max-w-xs space-y-1 text-sm">
                <div className="flex justify-between gap-4"><dt className="text-ink-soft">Subtotal</dt><dd className="tabular-nums">{rs(totals.subtotalPaisa)}</dd></div>
                {totals.kind === 'TAX_INVOICE' && <div className="flex justify-between gap-4"><dt className="text-ink-soft">VAT ({totals.vatRate}%)</dt><dd className="tabular-nums">{rs(totals.vatPaisa)}</dd></div>}
                <div className="flex justify-between gap-4 border-t border-sand pt-1 font-bold"><dt>Total</dt><dd className="tabular-nums">{rs(totals.totalPaisa)}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">
                {settings === null
                  ? 'Loading the billing profile…'
                  : settings === false
                  ? 'The billing profile could not be loaded; the server computes the totals.'
                  : settings.vatRegistered
                  ? `Tax invoice: ${settings.vatRate}% VAT is added on top, as set in the billing profile. Totals are recalculated when the invoice is issued.`
                  : 'Plain invoice without VAT — the billing profile is not VAT registered. Totals are recalculated when the invoice is issued.'}
              </p>
              {over && (
                <p className="mt-2 flex gap-2 text-sm font-semibold text-brand" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  The subtotal is more than the {rs(position.remainingPaisa)} left to bill. You can save the draft, but it cannot be issued like this.
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
          <button type="submit" disabled={saving || (!editing && (!account || !subject))} className="btn btn-primary">
            {saving ? 'Saving…' : 'Save draft'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default InvoiceForm;
