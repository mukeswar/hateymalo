import React, { useCallback, useEffect, useState } from 'react';
import {
  Send, Lock, Plus, Trash2, ExternalLink, BadgeCheck, AlertTriangle, Globe, Mail, Phone, CircleDot, ArrowRight, FileText, ReceiptText,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import InvoiceForm from '../revenue/InvoiceForm';
import { InvoiceChip, OverdueChip, rs } from '../../../components/revenue/revenueShared';
import Avatar from '../../../components/ui/Avatar';
import {
  SP, RESOURCE_TYPES, DELIVERABLE_TYPES, DELIVERABLE_STATUSES, VALUATION_METHODS, INKIND_STATUSES, PAYMENT_METHODS,
  CONTRACTED_STAGES, CLOSED_STAGES, allowedMoves, label, npr, hasValue, fmtDate, fmtDateTime, toDateInput, errMsg, isHttpUrl, idOf,
  Chip, Drawer, Field, Select, ListEditor, LinkList, UrlPreview, NoteDialog, SubTabs, Loading, Empty,
  BTN_PRIMARY, BTN_PINE, BTN_GHOST, BTN_DANGER, ICON_BTN,
} from './shared';

const Section = ({ title, children, actions }) => (
  <section className="card p-4 sm:p-5">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

const Row = ({ k, children }) => (
  <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:gap-3">
    <dt className="w-40 shrink-0 text-sm text-muted">{k}</dt>
    <dd className="min-w-0 text-sm font-medium text-ink">{children}</dd>
  </div>
);

const MoneyTile = ({ k, v, hint, tone = 'text-ink' }) => (
  <div className="rounded-2xl border border-sand bg-white p-3">
    <p className="text-xs font-semibold text-muted">{k}</p>
    <p className={`mt-1 font-display text-xl font-bold tabular-nums ${tone}`}>{v}</p>
    {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
  </div>
);

/* ---------------- Overview ---------------- */

const Overview = ({ deal, onMove }) => {
  const v = deal.viewer || {};
  const s = deal.sponsor || {};
  const moves = allowedMoves(deal.stage, v);
  const seesMoney = hasValue(deal.cashAmount);
  const activeInKind = (deal.inKindItems || []).filter((i) => i.status !== 'CANCELLED');
  return (
    <div className="space-y-4">
      <Section title="Stage">
        <div className="flex flex-wrap items-center gap-2">
          <Chip status={deal.stage} className="!text-sm" />
          {moves.length > 0 && <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />}
          {moves.map((to) => (
            <button
              key={to}
              type="button"
              onClick={() => onMove(to)}
              className={to === 'AGREED' || to === 'FULFILLED' ? BTN_PINE : ['DECLINED', 'CANCELLED'].includes(to) ? BTN_DANGER : BTN_GHOST}
            >
              {to === 'AGREED' ? 'Agree deal' : to === 'FULFILLED' ? 'Mark fulfilled' : to === 'DECLINED' ? 'Decline' : to === 'CANCELLED' ? 'Cancel deal' : `Move to ${label(to).toLowerCase()}`}
            </button>
          ))}
        </div>
        {moves.includes('AGREED') && (
          <p className="mt-2 text-xs text-muted">Agreeing needs a cash amount or an in-kind item in the terms, and a free package slot. It copies the campaign's deliverables onto this deal.</p>
        )}
        {moves.includes('FULFILLED') && <p className="mt-2 text-xs text-muted">Fulfilled needs every deliverable done or waived.</p>}
        {deal.stage === 'WITHDRAWN' && <p className="mt-2 text-sm text-muted">The sponsor withdrew this proposal. It cannot be reopened.</p>}
      </Section>

      {(seesMoney || hasValue(deal.amountReceived)) && (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {hasValue(deal.proposal?.amount) && <MoneyTile k="Proposed cash" v={npr(deal.proposal.amount)} hint="projected" />}
          {seesMoney && <MoneyTile k="Contracted cash" v={npr(deal.cashAmount)} />}
          {hasValue(deal.amountReceived) && <MoneyTile k="Received" v={npr(deal.amountReceived)} tone="text-pine" />}
          {hasValue(deal.amountReceived) && seesMoney && (
            <MoneyTile k="Outstanding" v={npr(Math.max(0, (deal.cashAmount || 0) - deal.amountReceived))} tone="text-brand" />
          )}
          {hasValue(deal.inKindEstimatedValue) && deal.inKindEstimatedValue > 0 && (
            <MoneyTile k="In-kind" v={npr(deal.inKindEstimatedValue)} hint="estimated value — not cash" tone="text-sky-ink" />
          )}
        </div>
      )}

      <Section title="Sponsor">
        <dl className="divide-y divide-sand">
          <Row k="Organisation">
            <span className="flex flex-wrap items-center gap-2">
              {s.name}
              <Chip status={s.verificationStatus}>{s.verificationStatus === 'VERIFIED' ? 'Verified' : label(s.verificationStatus)}</Chip>
              <span className="text-muted">{label(s.type)}</span>
            </span>
          </Row>
          {s.website && (
            <Row k="Website">
              <a href={s.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sky-ink hover:underline">
                <Globe className="h-3.5 w-3.5" aria-hidden="true" /> {s.website}
              </a>
            </Row>
          )}
          {(s.contactName || s.contactEmail || s.contactPhone) && (
            <Row k="Contact">
              <span className="flex flex-col gap-0.5">
                {s.contactName && <span>{s.contactName}</span>}
                {s.contactEmail && (
                  <a href={`mailto:${s.contactEmail}`} className="inline-flex items-center gap-1 text-sky-ink hover:underline"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{s.contactEmail}</a>
                )}
                {s.contactPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted" aria-hidden="true" />{s.contactPhone}</span>}
              </span>
            </Row>
          )}
          {s.panNumber && <Row k="PAN">{s.panNumber}</Row>}
          <Row k="Campaign">
            {deal.opportunity?.title} <span className="text-muted">· {label(deal.opportunity?.status)} · {fmtDate(deal.opportunity?.startDate)}</span>
          </Row>
        </dl>
      </Section>

      <Section title="Proposal">
        <dl className="divide-y divide-sand">
          <Row k="Package">
            {deal.tier ? (
              <>
                {deal.tier.name} <span className="text-muted">({label(deal.tier.level)}{hasValue(deal.tier.price) ? ` · ${deal.tier.price > 0 ? npr(deal.tier.price) : deal.tier.priceNote || 'by quotation'}` : ''})</span>
              </>
            ) : (
              <span className="text-muted">No package</span>
            )}
            {deal.isCustomQuote && <span className="chip ml-2 bg-sky-tint text-sky-ink">Custom quote</span>}
          </Row>
          {deal.proposal?.contributionTypes?.length > 0 && (
            <Row k="Offering">
              <span className="flex flex-wrap gap-1.5">
                {deal.proposal.contributionTypes.map((t) => <span key={t} className="chip bg-paper-deep text-ink-soft">{label(t)}</span>)}
              </span>
            </Row>
          )}
          <Row k="Message">
            {deal.proposal?.message ? <p className="whitespace-pre-line font-normal text-ink-soft">{deal.proposal.message}</p> : <span className="text-muted">—</span>}
          </Row>
          {activeInKind.length > 0 && (
            <Row k="In-kind items">
              <ul className="space-y-1">
                {activeInKind.map((i) => (
                  <li key={i._id}>
                    {i.description} {i.quantity ? `· ${i.quantity} ${i.unit}` : ''} <Chip status={i.status} />
                    {hasValue(i.estimatedValue) && i.estimatedValue > 0 && <span className="ml-1 text-xs text-muted">~{npr(i.estimatedValue)} estimated — not cash</span>}
                  </li>
                ))}
              </ul>
            </Row>
          )}
        </dl>
      </Section>

      <Section title="Logo">
        <div className="flex flex-wrap items-center gap-4">
          {deal.logoUrl ? (
            <img src={deal.logoUrl} alt={`${s.name} logo`} className="h-16 w-32 rounded-xl border border-sand bg-paper object-contain p-1" />
          ) : (
            <span className="text-sm text-muted">No logo chosen yet.</span>
          )}
          {deal.logoUsageApproved ? (
            <span className="chip bg-pine-tint text-pine"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Sponsor approved logo use {deal.logoApprovedAt ? `· ${fmtDate(deal.logoApprovedAt)}` : ''}</span>
          ) : (
            <span className="chip bg-marigold-tint text-marigold-text"><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Waiting for the sponsor to approve logo use</span>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Only the sponsor can approve their logo (in the sponsor portal). Unapproved logos never appear on artwork or the public page.</p>
      </Section>
    </div>
  );
};

/* ---------------- Terms ---------------- */

const blankItem = { type: 'MATERIALS', description: '', quantity: 0, unit: '', estimatedValue: 0, valuationMethod: 'NOT_VALUED', status: 'PLEDGED' };

const Terms = ({ deal, apply }) => {
  const { showToast } = useToast();
  const v = deal.viewer || {};
  const editable = v.isManager && !CLOSED_STAGES.includes(deal.stage);
  const [tiers, setTiers] = useState([]);
  const [f, setF] = useState(() => ({
    tier: idOf(deal.tier),
    isCustomQuote: !!deal.isCustomQuote,
    cashAmount: deal.cashAmount || 0,
    inKindItems: (deal.inKindItems || []).map((i) => ({ ...blankItem, ...i })),
    agreement: {
      documentUrl: deal.agreement?.documentUrl || '',
      terms: deal.agreement?.terms || '',
      signedAt: toDateInput(deal.agreement?.signedAt),
      signedByName: deal.agreement?.signedByName || '',
    },
    showOnPublicPage: deal.showOnPublicPage !== false,
  }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!v.isManager) return;
    API.get(`${SP}/tiers`, { params: { opportunity: idOf(deal.opportunity) } })
      .then((r) => setTiers(r.data.data || []))
      .catch(() => {});
  }, [v.isManager, deal.opportunity]);

  const setItem = (i, patch) => setF((p) => ({ ...p, inKindItems: p.inKindItems.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
  const setAg = (patch) => setF((p) => ({ ...p, agreement: { ...p.agreement, ...patch } }));

  const save = async (e) => {
    e.preventDefault();
    if (f.agreement.documentUrl && !isHttpUrl(f.agreement.documentUrl)) {
      showToast('Agreement document must be an http(s) link', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await API.put(`${SP}/deals/${deal._id}`, {
        tier: f.tier || null,
        isCustomQuote: f.isCustomQuote,
        cashAmount: Number(f.cashAmount) || 0,
        inKindItems: f.inKindItems
          .filter((i) => i.description.trim())
          .map((i) => ({
            ...(i._id ? { _id: i._id } : {}),
            type: i.type, description: i.description, quantity: Number(i.quantity) || 0, unit: i.unit,
            estimatedValue: Number(i.estimatedValue) || 0, valuationMethod: i.valuationMethod, status: i.status,
            receivedAt: i.status === 'RECEIVED' ? i.receivedAt || new Date().toISOString() : null,
          })),
        agreement: { ...f.agreement, signedAt: f.agreement.signedAt || null },
        showOnPublicPage: f.showOnPublicPage,
      });
      apply(res.data.data);
      showToast(res.data.message || 'Terms saved', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not save the terms'), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!editable) {
    // Read-only view (organisers and brand staff get no amounts from the API)
    const ag = deal.agreement || {};
    return (
      <div className="space-y-4">
        {v.isManager && CLOSED_STAGES.includes(deal.stage) && (
          <p className="rounded-2xl bg-marigold-tint px-4 py-3 text-sm text-marigold-text">Reopen the deal (move it to review) before changing its terms.</p>
        )}
        <Section title="Agreement">
          <dl className="divide-y divide-sand">
            {hasValue(deal.cashAmount) && <Row k="Contracted cash">{npr(deal.cashAmount)}</Row>}
            <Row k="Package">{deal.tier?.name || '—'}{deal.isCustomQuote ? ' · custom quote' : ''}</Row>
            <Row k="Signed">{ag.signedAt ? `${fmtDate(ag.signedAt)}${ag.signedByName ? ` by ${ag.signedByName}` : ''}` : 'Not signed yet'}</Row>
            {ag.documentUrl && <Row k="Document"><LinkList urls={[ag.documentUrl]} /></Row>}
            {ag.terms && <Row k="Terms"><p className="whitespace-pre-line font-normal">{ag.terms}</p></Row>}
            <Row k="Public page">{deal.showOnPublicPage !== false ? 'Shown on the campaign page' : 'Hidden from the public page'}</Row>
          </dl>
        </Section>
        <Section title="In-kind contributions">
          {(deal.inKindItems || []).length === 0 ? (
            <p className="text-sm text-muted">None.</p>
          ) : (
            <ul className="divide-y divide-sand">
              {deal.inKindItems.map((i) => (
                <li key={i._id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span>{label(i.type)} · {i.description} {i.quantity ? `(${i.quantity} ${i.unit})` : ''}</span>
                  <span className="flex items-center gap-2">
                    {hasValue(i.estimatedValue) && i.estimatedValue > 0 && <span className="text-xs text-muted">~{npr(i.estimatedValue)} est. — not cash</span>}
                    <Chip status={i.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    );
  }

  const pid = `terms-${deal._id}`;
  const est = f.inKindItems.filter((i) => i.status !== 'CANCELLED').reduce((s, i) => s + (Number(i.estimatedValue) || 0), 0);
  return (
    <form onSubmit={save} className="space-y-4">
      <Section title="Commercial terms">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${pid}-tier`} label="Package">
            <select id={`${pid}-tier`} value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })} className="field">
              <option value="">No package (custom)</option>
              {f.tier && !tiers.some((t) => t._id === f.tier) && <option value={f.tier}>{deal.tier?.name || 'Current package'}</option>}
              {tiers.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} — {t.price > 0 ? npr(t.price) : t.priceNote || 'by quotation'}{t.slots ? ` (${t.slotsTaken}/${t.slots} taken)` : ''}{t.isActive ? '' : ' [hidden]'}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${pid}-cash`} label="Contracted cash (whole NPR)" hint={Number(f.cashAmount) > 0 ? npr(f.cashAmount) : 'Cash the sponsor commits to pay.'}>
            <input id={`${pid}-cash`} type="number" min="0" step="1" value={f.cashAmount} onChange={(e) => setF({ ...f, cashAmount: e.target.value })} className="field" />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={f.isCustomQuote} onChange={(e) => setF({ ...f, isCustomQuote: e.target.checked })} className="h-5 w-5 accent-[#B5232C]" />
            Custom quote
          </label>
          <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input type="checkbox" checked={f.showOnPublicPage} onChange={(e) => setF({ ...f, showOnPublicPage: e.target.checked })} className="h-5 w-5 accent-[#B5232C]" />
            Show this sponsor on the public campaign page
          </label>
        </div>
      </Section>

      <Section title="In-kind contributions" actions={est > 0 ? <span className="text-xs font-semibold text-sky-ink">{npr(est)} estimated value — not cash</span> : null}>
        <div className="space-y-3">
          {f.inKindItems.map((it, i) => (
            <div key={it._id || `new-${i}`} className="space-y-2 rounded-2xl border border-sand bg-paper/50 p-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[9rem_1fr_5.5rem_5.5rem]">
                <Select aria-label={`Item ${i + 1} type`} value={it.type} onChange={(v2) => setItem(i, { type: v2 })} options={RESOURCE_TYPES} />
                <input aria-label={`Item ${i + 1} description`} required maxLength={300} value={it.description} onChange={(e) => setItem(i, { description: e.target.value })} placeholder="What is given" className="field col-span-2 sm:col-span-1" />
                <input aria-label={`Item ${i + 1} quantity`} type="number" min="0" value={it.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} placeholder="Qty" className="field" />
                <input aria-label={`Item ${i + 1} unit`} maxLength={30} value={it.unit} onChange={(e) => setItem(i, { unit: e.target.value })} placeholder="Unit" className="field" />
              </div>
              <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Field id={`${pid}-ev-${i}`} label="Estimated value (NPR)" hint="estimated — not cash">
                  <input id={`${pid}-ev-${i}`} type="number" min="0" step="1" value={it.estimatedValue} onChange={(e) => setItem(i, { estimatedValue: e.target.value })} className="field" />
                </Field>
                <Field id={`${pid}-vm-${i}`} label="Valuation method">
                  <Select id={`${pid}-vm-${i}`} value={it.valuationMethod} onChange={(v2) => setItem(i, { valuationMethod: v2 })} options={VALUATION_METHODS} />
                </Field>
                <Field id={`${pid}-st-${i}`} label="Status">
                  <Select id={`${pid}-st-${i}`} value={it.status} onChange={(v2) => setItem(i, { status: v2, receivedAt: v2 === 'RECEIVED' ? it.receivedAt || new Date().toISOString() : null })} options={INKIND_STATUSES} />
                </Field>
                <button type="button" onClick={() => setF((p) => ({ ...p, inKindItems: p.inKindItems.filter((_, j) => j !== i) }))} className={`${ICON_BTN} mb-0.5`} aria-label={`Remove item ${i + 1}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {it.status === 'RECEIVED' && <p className="text-xs text-pine">Received {fmtDate(it.receivedAt)}</p>}
            </div>
          ))}
          <button type="button" onClick={() => setF((p) => ({ ...p, inKindItems: [...p.inKindItems, { ...blankItem }] }))} className={BTN_GHOST}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add in-kind item
          </button>
        </div>
      </Section>

      <Section title="Agreement">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${pid}-doc`} label="Signed agreement link" className="sm:col-span-2">
            <input id={`${pid}-doc`} type="url" value={f.agreement.documentUrl} onChange={(e) => setAg({ documentUrl: e.target.value })} placeholder="https://…" className="field" />
            {f.agreement.documentUrl && !isHttpUrl(f.agreement.documentUrl) && <p className="mt-1 text-xs font-semibold text-brand">Use an http(s) link.</p>}
          </Field>
          <Field id={`${pid}-signed`} label="Signed on">
            <input id={`${pid}-signed`} type="date" value={f.agreement.signedAt} onChange={(e) => setAg({ signedAt: e.target.value })} className="field" />
          </Field>
          <Field id={`${pid}-signer`} label="Signed by (sponsor)">
            <input id={`${pid}-signer`} maxLength={120} value={f.agreement.signedByName} onChange={(e) => setAg({ signedByName: e.target.value })} className="field" />
          </Field>
          <Field id={`${pid}-terms`} label="Key terms" className="sm:col-span-2">
            <textarea id={`${pid}-terms`} rows={4} maxLength={4000} value={f.agreement.terms} onChange={(e) => setAg({ terms: e.target.value })} className="field" />
          </Field>
        </div>
      </Section>

      <div className="sticky bottom-0 flex justify-end rounded-2xl border border-sand bg-white/95 p-3 backdrop-blur">
        <button type="submit" disabled={busy} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save terms'}</button>
      </div>
    </form>
  );
};

/* ---------------- Messages ---------------- */

const Messages = ({ deal, apply }) => {
  const { showToast } = useToast();
  const v = deal.viewer || {};
  const canWrite = v.isManager || v.isOrganizer || v.isFinance;
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    try {
      const res = await API.post(`${SP}/deals/${deal._id}/messages`, { body, internal });
      apply(res.data.data);
      setBody('');
      showToast(internal ? 'Internal note added' : 'Message sent to the sponsor', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not send'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const msgs = deal.messages || [];
  return (
    <div className="space-y-4">
      {msgs.length === 0 ? (
        <Empty>No messages yet.</Empty>
      ) : (
        <ol className="space-y-3" aria-label="Conversation">
          {msgs.map((m) => {
            const ours = m.authorSide === 'HATEYMALO';
            return (
              <li key={m._id} className={`flex gap-3 ${ours ? 'flex-row-reverse' : ''}`}>
                <Avatar name={m.author?.name || '?'} src={m.author?.profilePicture} size="sm" />
                <div
                  className={`max-w-[85%] rounded-2xl border px-3.5 py-2.5 ${
                    m.internal ? 'border-dashed border-marigold bg-marigold-tint' : ours ? 'border-sand bg-white' : 'border-sky-tint bg-sky-tint'
                  }`}
                >
                  <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                    <span className="font-semibold text-ink">{m.author?.name || 'Unknown'}</span>
                    <span>{ours ? 'Hateymalo' : 'Sponsor'}</span>
                    <span>{fmtDateTime(m.at)}</span>
                  </p>
                  {m.internal && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-marigold-text">
                      <Lock className="h-3 w-3" aria-hidden="true" /> Internal note — not visible to the sponsor
                    </p>
                  )}
                  <p className="mt-1 whitespace-pre-line text-sm text-ink">{m.body}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
      {canWrite ? (
        <form onSubmit={send} className="card space-y-3 p-4">
          <label htmlFor={`msg-${deal._id}`} className="field-label">{internal ? 'Internal note (team only)' : 'Message to the sponsor'}</label>
          <textarea id={`msg-${deal._id}`} rows={3} maxLength={3000} value={body} onChange={(e) => setBody(e.target.value)} className={`field ${internal ? '!border-marigold !bg-marigold-tint/40' : ''}`} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-5 w-5 accent-[#E9A23B]" />
              <Lock className="h-4 w-4 text-marigold-text" aria-hidden="true" /> Internal note
            </label>
            <button type="submit" disabled={busy || !body.trim()} className={BTN_PRIMARY}>
              <Send className="h-4 w-4" aria-hidden="true" /> {busy ? 'Sending…' : internal ? 'Add note' : 'Send'}
            </button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted">Brand staff can read the thread; messaging is for managers, organisers and finance.</p>
      )}
    </div>
  );
};

/* ---------------- Deliverables ---------------- */

const DeliverableRow = ({ deal, d, apply }) => {
  const { showToast } = useToast();
  const v = deal.viewer || {};
  const [f, setF] = useState({ status: d.status, proofUrls: d.proofUrls || [], proofNote: d.proofNote || '', dueDate: toDateInput(d.dueDate) });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sig = [d.status, d.proofNote, d.dueDate, (d.proofUrls || []).join('|')].join('~');
  useEffect(() => {
    setF({ status: d.status, proofUrls: d.proofUrls || [], proofNote: d.proofNote || '', dueDate: toDateInput(d.dueDate) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);
  const statuses = DELIVERABLE_STATUSES.filter((s) => s !== 'WAIVED' || v.isManager || d.status === 'WAIVED');
  const save = async () => {
    const urls = f.proofUrls.map((u) => u.trim()).filter(Boolean);
    if (urls.some((u) => !isHttpUrl(u))) {
      showToast('Each proof must be an http(s) link', 'error');
      return;
    }
    if (f.status === 'DONE' && !urls.length && !f.proofNote.trim()) {
      showToast('Add a proof link or note before marking this done', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await API.put(`${SP}/deals/${deal._id}/deliverables/${d._id}`, { status: f.status, proofUrls: urls, proofNote: f.proofNote, dueDate: f.dueDate || null });
      apply(res.data.data);
      showToast(res.data.message || 'Deliverable saved', 'success');
      setOpen(false);
    } catch (err) {
      showToast(errMsg(err, 'Could not save'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm(`Remove the deliverable "${d.title}"?`)) return;
    try {
      const res = await API.delete(`${SP}/deals/${deal._id}/deliverables/${d._id}`);
      apply(res.data.data);
      showToast('Deliverable removed', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not remove'), 'error');
    }
  };
  const overdue = d.dueDate && !['DONE', 'WAIVED'].includes(d.status) && new Date(d.dueDate) < new Date();
  const pid = `dl-${d._id}`;
  return (
    <li className="rounded-2xl border border-sand bg-white p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-ink">{d.title}</p>
          <p className="text-xs text-muted">
            {label(d.type)} · due {fmtDate(d.dueDate)} {overdue && <span className="font-bold text-brand">· overdue</span>}
            {d.completedBy?.name && ` · ${label(d.status).toLowerCase()} by ${d.completedBy.name} ${fmtDate(d.completedAt)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Chip status={d.status} />
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className={BTN_GHOST}>{open ? 'Close' : 'Update'}</button>
          {v.isManager && (
            <button type="button" onClick={remove} className={ICON_BTN} aria-label={`Remove ${d.title}`}><Trash2 className="h-4 w-4" /></button>
          )}
        </div>
      </div>
      {!open && (d.proofUrls?.length > 0 || d.proofNote) && (
        <div className="mt-2 space-y-1 border-t border-sand pt-2">
          <LinkList urls={d.proofUrls} />
          {d.proofNote && <p className="text-sm text-ink-soft">{d.proofNote}</p>}
        </div>
      )}
      {open && (
        <div className="mt-3 space-y-3 border-t border-sand pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${pid}-status`} label="Status">
              <Select id={`${pid}-status`} value={f.status} onChange={(s) => setF({ ...f, status: s })} options={statuses} />
            </Field>
            <Field id={`${pid}-due`} label="Due date">
              <input id={`${pid}-due`} type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="field" />
            </Field>
          </div>
          <fieldset>
            <legend className="field-label">Proof links (photos, posts, videos)</legend>
            <ListEditor idPrefix={`${pid}-proof`} type="url" items={f.proofUrls} onChange={(proofUrls) => setF({ ...f, proofUrls })} placeholder="https://…" addLabel="Add proof link" max={20} />
          </fieldset>
          <Field id={`${pid}-note`} label="Proof note">
            <textarea id={`${pid}-note`} rows={2} maxLength={1000} value={f.proofNote} onChange={(e) => setF({ ...f, proofNote: e.target.value })} className="field" />
          </Field>
          <div className="flex justify-end">
            <button type="button" disabled={busy} onClick={save} className={BTN_PRIMARY}>{busy ? 'Saving…' : 'Save deliverable'}</button>
          </div>
        </div>
      )}
    </li>
  );
};

const Deliverables = ({ deal, apply }) => {
  const { showToast } = useToast();
  const v = deal.viewer || {};
  const canAdd = v.isManager || v.isOrganizer;
  const [f, setF] = useState({ title: '', type: 'OTHER', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const list = deal.deliverables || [];
  const done = list.filter((d) => ['DONE', 'WAIVED'].includes(d.status)).length;
  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await API.post(`${SP}/deals/${deal._id}/deliverables`, { ...f, dueDate: f.dueDate || null });
      apply(res.data.data);
      setF({ title: '', type: 'OTHER', dueDate: '' });
      showToast('Deliverable added', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not add'), 'error');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      {list.length > 0 && (
        <div>
          <div className="mb-1 flex justify-between text-sm"><span className="font-semibold text-ink">Progress</span><span className="tabular-nums text-muted">{done}/{list.length} done or waived</span></div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${(done / list.length) * 100}%` }} /></div>
        </div>
      )}
      {list.length === 0 ? (
        <Empty>{CONTRACTED_STAGES.includes(deal.stage) ? 'No deliverables on this deal.' : 'Deliverables are copied from the campaign template when the deal is agreed.'}</Empty>
      ) : (
        <ul className="space-y-2.5">{list.map((d) => <DeliverableRow key={d._id} deal={deal} d={d} apply={apply} />)}</ul>
      )}
      {canAdd && (
        <form onSubmit={add} className="card space-y-3 p-4">
          <p className="text-sm font-bold text-ink">Add a deliverable</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_11rem_10rem]">
            <input aria-label="Deliverable title" required maxLength={200} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Thank-you post on Facebook" className="field" />
            <Select aria-label="Deliverable type" value={f.type} onChange={(t) => setF({ ...f, type: t })} options={DELIVERABLE_TYPES} />
            <input aria-label="Due date" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className="field" />
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className={BTN_GHOST}><Plus className="h-4 w-4" aria-hidden="true" /> Add</button>
          </div>
        </form>
      )}
    </div>
  );
};

/* ---------------- Payments (finance only) ---------------- */

// Link to an invoice in the admin Invoices tab (finance with canManageRevenue)
const invoiceLink = (id) => `/admin?tab=invoices&invoice=${id}`;

const Payments = ({ deal, apply }) => {
  const { showToast } = useToast();
  const { can } = useAuth();
  const canInvoices = can('canManageRevenue');
  // { message, invoice } when the server says the payment belongs on an invoice (409)
  const [blocked, setBlocked] = useState(null);
  const [f, setF] = useState({ amount: '', method: 'BANK_TRANSFER', reference: '', receivedAt: toDateInput(new Date()), note: '' });
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState(null);
  const contracted = deal.cashAmount || 0;
  const received = deal.amountReceived || 0;
  const canRecord = CONTRACTED_STAGES.includes(deal.stage);
  const record = async (e) => {
    e.preventDefault();
    if (f.method !== 'CASH' && !f.reference.trim()) {
      showToast('Add the bank or transaction reference', 'error');
      return;
    }
    setBusy(true);
    try {
      const res = await API.post(`${SP}/deals/${deal._id}/payments`, { ...f, amount: Number(f.amount) });
      apply(res.data.data);
      setF({ amount: '', method: 'BANK_TRANSFER', reference: '', receivedAt: toDateInput(new Date()), note: '' });
      setBlocked(null);
      showToast(res.data.message || 'Payment recorded', 'success');
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.invoice) setBlocked({ message: err.response.data.message, invoice: err.response.data.invoice });
      showToast(errMsg(err, 'Could not record the payment'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (reason) => {
    try {
      const res = await API.delete(`${SP}/deals/${deal._id}/payments/${removing._id}`, { params: { reason } });
      apply(res.data.data);
      showToast(res.data.message || 'Payment removed', 'success');
      setRemoving(null);
    } catch (err) {
      if (err?.response?.status === 409 && err.response.data?.invoice) setBlocked({ message: err.response.data.message, invoice: err.response.data.invoice });
      setRemoving(null);
      showToast(errMsg(err, 'Could not remove the payment'), 'error');
    }
  };
  const pid = `pay-${deal._id}`;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        <MoneyTile k="Contracted" v={npr(contracted)} />
        <MoneyTile k="Received" v={npr(received)} tone="text-pine" />
        <MoneyTile k="Outstanding" v={npr(Math.max(0, contracted - received))} tone={contracted - received > 0 ? 'text-brand' : 'text-ink'} />
      </div>
      {received > contracted && contracted > 0 && <p className="text-sm font-semibold text-marigold-text">More has been received than contracted — check the terms.</p>}
      <Section title="Payments received">
        {(deal.payments || []).length === 0 ? (
          <p className="text-sm text-muted">No payments recorded.</p>
        ) : (
          <ul className="divide-y divide-sand">
            {deal.payments.map((p) => (
              <li key={p._id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="min-w-0">
                  <p className="font-semibold tabular-nums text-ink">{npr(p.amount)} <span className="font-normal text-muted">· {label(p.method)}{p.reference ? ` · ${p.reference}` : ''}</span></p>
                  <p className="text-xs text-muted">Received {fmtDate(p.receivedAt)} · recorded by {p.recordedBy?.name || '—'}{p.note ? ` · ${p.note}` : ''}</p>
                </div>
                {p.invoice ? (
                  canInvoices ? (
                    <Link to={invoiceLink(p.invoice)} className={BTN_GHOST}><ReceiptText className="h-4 w-4" aria-hidden="true" /> On invoice</Link>
                  ) : (
                    <span className="chip bg-paper-deep text-ink-soft">Paid on an invoice</span>
                  )
                ) : (
                  <button type="button" onClick={() => setRemoving(p)} className={BTN_DANGER}>Remove</button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>
      {blocked && (
        <p className="flex flex-wrap items-start gap-2 rounded-2xl bg-marigold-tint px-4 py-3 text-sm text-marigold-text" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1">{blocked.message}</span>
          {canInvoices ? (
            <Link to={invoiceLink(blocked.invoice)} className="font-semibold text-ink underline">Open the invoice</Link>
          ) : (
            <span className="font-semibold">Ask someone with invoice access to record it.</span>
          )}
        </p>
      )}
      {canRecord ? (
        <form onSubmit={record} className="card space-y-3 p-4">
          <p className="text-sm font-bold text-ink">Record a payment</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id={`${pid}-amt`} label="Amount (whole NPR)">
              <input id={`${pid}-amt`} required type="number" min="1" step="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className="field" />
            </Field>
            <Field id={`${pid}-method`} label="Method">
              <Select id={`${pid}-method`} value={f.method} onChange={(m) => setF({ ...f, method: m })} options={PAYMENT_METHODS} />
            </Field>
            <Field id={`${pid}-ref`} label={f.method === 'CASH' ? 'Reference (optional for cash)' : 'Bank / transaction reference'}>
              <input id={`${pid}-ref`} required={f.method !== 'CASH'} maxLength={120} value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} className="field" />
            </Field>
            <Field id={`${pid}-date`} label="Received on">
              <input id={`${pid}-date`} required type="date" max={toDateInput(new Date())} value={f.receivedAt} onChange={(e) => setF({ ...f, receivedAt: e.target.value })} className="field" />
            </Field>
            <Field id={`${pid}-note`} label="Note" className="sm:col-span-2">
              <input id={`${pid}-note`} maxLength={300} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} className="field" />
            </Field>
          </div>
          <div className="flex justify-end">
            <button type="submit" disabled={busy} className={BTN_PINE}>{busy ? 'Recording…' : 'Record payment'}</button>
          </div>
        </form>
      ) : (
        <p className="rounded-2xl bg-paper-deep px-4 py-3 text-sm text-ink-soft">Payments can be recorded once the deal is agreed.</p>
      )}
      {removing && (
        <NoteDialog
          title="Remove payment"
          message={`Remove ${npr(removing.amount)} (${label(removing.method)}${removing.reference ? ` ${removing.reference}` : ''})? The reason is kept in the activity log.`}
          fieldLabel="Reason"
          required
          danger
          confirmLabel="Remove payment"
          onCancel={() => setRemoving(null)}
          onConfirm={remove}
        />
      )}
    </div>
  );
};

/* ---------------- Invoices (finance with canManageRevenue) ---------------- */

const DealInvoices = ({ deal }) => {
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const canInvoice = CONTRACTED_STAGES.includes(deal.stage) && (deal.cashAmount || 0) > 0;
  useEffect(() => {
    API.get('/revenue/invoices', { params: { deal: deal._id } })
      .then((r) => setList(r.data.data || []))
      .catch((e) => {
        setList([]);
        setError(errMsg(e, 'Could not load invoices'));
      });
  }, [deal._id]);
  return (
    <Section
      title="Invoices"
      actions={
        canInvoice && (
          <button type="button" onClick={() => setCreating(true)} className={BTN_PRIMARY}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create invoice
          </button>
        )
      }
    >
      {!canInvoice && <p className="mb-3 text-sm text-muted">Only agreed deals with a cash amount can be invoiced.</p>}
      {list === null ? (
        <Loading>Loading invoices…</Loading>
      ) : error ? (
        <p className="text-sm text-brand">{error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">No invoices for this deal yet. While an invoice is open, payments are recorded on the invoice.</p>
      ) : (
        <ul className="divide-y divide-sand">
          {list.map((i) => (
            <li key={i._id}>
              <Link to={invoiceLink(i._id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2.5 hover:bg-paper">
                <span className="min-w-0">
                  <span className="block font-semibold tabular-nums text-ink">{i.number || 'Draft'}</span>
                  <span className="block text-xs text-muted">{i.issueDate ? `Issued ${fmtDate(i.issueDate)}` : 'Not issued'}{i.dueDate ? ` · due ${fmtDate(i.dueDate)}` : ''}</span>
                </span>
                <span className="flex flex-wrap items-center gap-2">
                  <InvoiceChip status={i.status} />
                  {i.overdue && <OverdueChip />}
                  <span className="text-sm font-semibold tabular-nums text-ink">{rs(i.totalPaisa)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {creating && (
        <InvoiceForm
          preset={{ sponsorAccount: idOf(deal.sponsor), subjectType: 'SPONSORSHIP_DEAL', deal: deal._id }}
          onClose={() => setCreating(false)}
          onSaved={(inv) => {
            setCreating(false);
            navigate(invoiceLink(inv._id));
          }}
        />
      )}
    </Section>
  );
};

/* ---------------- Impact report ---------------- */

const Report = ({ deal, apply }) => {
  const { showToast } = useToast();
  const v = deal.viewer || {};
  const canEdit = (v.isManager || v.isOrganizer) && CONTRACTED_STAGES.includes(deal.stage);
  const r = deal.report || {};
  const [f, setF] = useState({ summary: r.summary || '', highlights: r.highlights || [], mediaUrls: r.mediaUrls || [] });
  const [busy, setBusy] = useState(false);
  const save = async (share) => {
    const mediaUrls = f.mediaUrls.map((u) => u.trim()).filter(Boolean);
    if (mediaUrls.some((u) => !isHttpUrl(u))) {
      showToast('Each media item must be an http(s) link', 'error');
      return;
    }
    if (share && !f.summary.trim()) {
      showToast('Write the report summary before sharing it', 'error');
      return;
    }
    if (share && !window.confirm('Share this impact report with the sponsor? They will be notified.')) return;
    setBusy(true);
    try {
      const res = await API.put(`${SP}/deals/${deal._id}/report`, {
        summary: f.summary,
        highlights: f.highlights.map((h) => h.trim()).filter(Boolean),
        mediaUrls,
        ...(share ? { share: true } : {}),
      });
      apply(res.data.data);
      showToast(res.data.message || 'Report saved', 'success');
    } catch (err) {
      showToast(errMsg(err, 'Could not save the report'), 'error');
    } finally {
      setBusy(false);
    }
  };
  const pid = `rep-${deal._id}`;
  if (!canEdit) {
    return (
      <div className="space-y-3">
        {!CONTRACTED_STAGES.includes(deal.stage) && <p className="rounded-2xl bg-paper-deep px-4 py-3 text-sm text-ink-soft">Impact reports are written for agreed deals.</p>}
        {r.summary ? (
          <Section title="Impact report">
            <p className="whitespace-pre-line text-sm text-ink-soft">{r.summary}</p>
            {r.highlights?.length > 0 && <ul className="mt-3 list-inside list-disc text-sm">{r.highlights.map((h, i) => <li key={i}>{h}</li>)}</ul>}
            <div className="mt-3"><LinkList urls={r.mediaUrls} /></div>
            <p className="mt-3 text-xs text-muted">{r.sharedAt ? `Shared with the sponsor ${fmtDateTime(r.sharedAt)}` : 'Not shared with the sponsor yet'}</p>
          </Section>
        ) : (
          CONTRACTED_STAGES.includes(deal.stage) && <Empty icon={FileText}>No report written yet.</Empty>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className={`rounded-2xl px-4 py-3 text-sm font-semibold ${r.sharedAt ? 'bg-pine-tint text-pine' : 'bg-paper-deep text-ink-soft'}`}>
        {r.sharedAt ? `Shared with the sponsor ${fmtDateTime(r.sharedAt)}. Saving keeps it shared; "Share again" notifies them of the update.` : 'Draft — the sponsor cannot see this until you share it.'}
      </p>
      <Field id={`${pid}-sum`} label="Summary">
        <textarea id={`${pid}-sum`} rows={6} maxLength={8000} value={f.summary} onChange={(e) => setF({ ...f, summary: e.target.value })} className="field" placeholder="What the sponsorship made possible…" />
      </Field>
      <fieldset>
        <legend className="field-label">Highlights</legend>
        <ListEditor idPrefix={`${pid}-hl`} items={f.highlights} onChange={(highlights) => setF({ ...f, highlights })} placeholder="e.g. 2.4 tonnes of waste collected" addLabel="Add highlight" max={20} />
      </fieldset>
      <fieldset>
        <legend className="field-label">Photo / video links</legend>
        <ListEditor idPrefix={`${pid}-media`} type="url" items={f.mediaUrls} onChange={(mediaUrls) => setF({ ...f, mediaUrls })} placeholder="https://…" addLabel="Add link" max={40} />
        {f.mediaUrls.filter(isHttpUrl).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {f.mediaUrls.filter(isHttpUrl).slice(0, 6).map((u) => <UrlPreview key={u} url={u} className="h-20 w-28" />)}
          </div>
        )}
      </fieldset>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" disabled={busy} onClick={() => save(false)} className={BTN_GHOST}>Save</button>
        <button type="button" disabled={busy} onClick={() => save(true)} className={BTN_PINE}><Send className="h-4 w-4" aria-hidden="true" /> {r.sharedAt ? 'Share again' : 'Share with sponsor'}</button>
      </div>
    </div>
  );
};

/* ---------------- History ---------------- */

const History = ({ deal }) => {
  const h = [...(deal.history || [])].reverse();
  if (!h.length) return <Empty>No history.</Empty>;
  return (
    <ol className="relative space-y-4 border-l-2 border-sand pl-5">
      {h.map((e) => (
        <li key={e._id} className="relative">
          <CircleDot className="absolute -left-[31px] top-0.5 h-5 w-5 rounded-full bg-paper text-brand" aria-hidden="true" />
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <Chip status={e.stage} />
            <span className="text-muted">{fmtDateTime(e.at)}{e.by?.name ? ` · ${e.by.name}` : ''}</span>
          </p>
          {e.note && <p className="mt-1 text-sm text-ink-soft">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
};

/* ---------------- Drawer ---------------- */

/** Full deal record for staff and organisers. Every section follows `deal.viewer`. */
const DealDrawer = ({ dealId, onClose, onChanged }) => {
  const { showToast } = useToast();
  const [deal, setDeal] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('overview');
  const [moving, setMoving] = useState(null);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await API.get(`${SP}/deals/${dealId}`);
      setDeal(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not load this deal'));
    }
  }, [dealId]);

  useEffect(() => {
    setDeal(null);
    setTab('overview');
    load();
  }, [load]);

  const apply = (d) => {
    setDeal(d);
    onChanged?.(d);
  };

  const move = async (note) => {
    try {
      const res = await API.put(`${SP}/deals/${dealId}/stage`, { stage: moving, note });
      apply(res.data.data);
      showToast(res.data.message || 'Stage changed', 'success');
      setMoving(null);
    } catch (e) {
      showToast(errMsg(e, 'Could not change the stage'), 'error');
    }
  };

  const { can } = useAuth();
  const canInvoices = can('canManageRevenue');
  const v = deal?.viewer || {};
  const msgCount = (deal?.messages || []).length;
  const tabs = deal
    ? [
        { id: 'overview', label: 'Overview' },
        { id: 'terms', label: 'Terms' },
        { id: 'messages', label: `Messages${msgCount ? ` (${msgCount})` : ''}` },
        { id: 'deliverables', label: 'Deliverables' },
        ...(v.isFinance ? [{ id: 'payments', label: 'Payments' }] : []),
        ...(canInvoices ? [{ id: 'invoices', label: 'Invoices' }] : []),
        { id: 'report', label: 'Impact report' },
        { id: 'history', label: 'History' },
      ]
    : [];

  return (
    <Drawer
      title={deal ? deal.sponsor?.name : 'Deal'}
      subtitle={deal ? <span className="flex flex-wrap items-center gap-2">{deal.opportunity?.title} <Chip status={deal.stage} /></span> : null}
      onClose={onClose}
    >
      {error ? (
        <Empty icon={AlertTriangle} action={<button type="button" onClick={load} className={BTN_GHOST}>Try again</button>}>{error}</Empty>
      ) : !deal ? (
        <Loading>Loading deal…</Loading>
      ) : (
        <div className="space-y-4 p-4 sm:p-6">
          <SubTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Deal sections" />
          <div role="tabpanel">
            {tab === 'overview' && <Overview deal={deal} onMove={setMoving} />}
            {tab === 'terms' && <Terms key={`${deal._id}-${deal.updatedAt}`} deal={deal} apply={apply} />}
            {tab === 'messages' && <Messages deal={deal} apply={apply} />}
            {tab === 'deliverables' && <Deliverables deal={deal} apply={apply} />}
            {tab === 'payments' && v.isFinance && <Payments deal={deal} apply={apply} />}
            {tab === 'invoices' && canInvoices && <DealInvoices deal={deal} />}
            {tab === 'report' && <Report key={`${deal._id}-${deal.report?.sharedAt || ''}`} deal={deal} apply={apply} />}
            {tab === 'history' && <History deal={deal} />}
          </div>
          {deal.opportunity?._id && (
            <a href={`/sponsor/opportunities/${deal.opportunity._id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-sky-ink hover:underline">
              View public campaign page <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      {moving && (
        <NoteDialog
          title={`Move to ${label(moving).toLowerCase()}`}
          message={
            moving === 'DECLINED' || moving === 'CANCELLED'
              ? 'The sponsor will be notified. Add a short reason for the record.'
              : moving === 'AGREED'
              ? 'The sponsor is notified and the campaign deliverables are copied onto this deal.'
              : 'The sponsor will be notified of the change.'
          }
          confirmLabel={moving === 'AGREED' ? 'Agree deal' : 'Move'}
          danger={['DECLINED', 'CANCELLED'].includes(moving)}
          onCancel={() => setMoving(null)}
          onConfirm={move}
        />
      )}
    </Drawer>
  );
};

export default DealDrawer;
