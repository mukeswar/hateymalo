import React, { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/ui/Avatar';
import BrandKitPreview from '../../components/sponsorship/BrandKitPreview';
import {
  BackLink,
  CONTRACTED_STAGES,
  Chip,
  DELIVERABLE_STATUS,
  DELIVERABLE_TYPES,
  EDITABLE_STAGES,
  InKindEditor,
  InKindList,
  LogoTile,
  Modal,
  NotFoundCard,
  PAYMENT_METHODS,
  PageSkeleton,
  RESOURCE_TYPES,
  STAGES,
  STAGE_ORDER,
  TIER_LEVELS,
  TypeToggles,
  UrlPreviewField,
  cleanInKind,
  errMsg,
  fmtDate,
  fmtDateTime,
  isHttpUrl,
  npr,
  safeUrl,
} from '../../components/sponsorship/shared';
import {
  BadgeCheck,
  CheckCircle2,
  Circle,
  ExternalLink,
  Eye,
  FileSignature,
  Loader2,
  MessageSquare,
  Palette,
  Pencil,
  Printer,
  Receipt,
  Send,
  ShieldOff,
  Undo2,
  ListChecks,
  Image as ImageIcon,
  Info,
  LineChart,
} from 'lucide-react';

const Panel = ({ id, icon: Icon, title, action, children, className = '' }) => (
  <section aria-labelledby={id} className={`card p-5 sm:p-6 ${className}`}>
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h2 id={id} className="text-xl font-bold text-ink flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-xl bg-brand-tint text-brand flex items-center justify-center"><Icon className="w-[18px] h-[18px]" aria-hidden="true" /></span>
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
);

const Stepper = ({ stage }) => {
  const closed = !STAGE_ORDER.includes(stage);
  const idx = STAGE_ORDER.indexOf(stage);
  return (
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-2" aria-label="Deal progress">
      {STAGE_ORDER.map((s, i) => {
        const done = !closed && i <= idx;
        const current = !closed && i === idx;
        return (
          <li key={s} className="min-w-0" aria-current={current ? 'step' : undefined}>
            <span className={`block h-1.5 rounded-full ${done ? 'bg-pine' : 'bg-sand'}`} />
            <span className={`block text-[11px] sm:text-xs mt-1.5 truncate ${current ? 'font-bold text-ink' : done ? 'text-ink-soft' : 'text-muted'}`}>{STAGES[s].label}</span>
          </li>
        );
      })}
    </ol>
  );
};

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  #impact-report, #impact-report * { visibility: visible !important; }
  #impact-report { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; }
  #impact-report .no-print { display: none !important; }
}`;

const SponsorDeal = () => {
  const { id } = useParams();
  const { showToast } = useToast();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  // Proposal editing
  const [editing, setEditing] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [draft, setDraft] = useState(null);

  // Logo
  const [logoInput, setLogoInput] = useState('');
  const [consent, setConsent] = useState(false);

  // Messages
  const [msg, setMsg] = useState('');
  const threadRef = useRef(null);

  // Withdraw
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawNote, setWithdrawNote] = useState('');

  const [showKit, setShowKit] = useState(false);

  const apply = (d) => {
    setDeal(d);
    setLogoInput(d?.logoUrl || '');
    setConsent(false);
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    API.get(`/sponsorship/deals/${id}`)
      .then((r) => alive && apply(r.data?.data || null))
      .catch(() => alive && setDeal(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [deal?.messages?.length]);

  if (loading) return <PageSkeleton label="Loading sponsorship" />;
  if (!deal) {
    return <NotFoundCard title="We couldn't open this sponsorship" body="It may not exist, or your account may not have access to it." to="/sponsor/portal" cta="Back to sponsor portal" />;
  }

  const v = deal.viewer || {};
  const canEdit = ['OWNER', 'EDITOR'].includes(v.sponsorRole);
  const isStaffOnly = !v.isSponsor && (v.isManager || v.isOrganizer || v.isFinance || v.isBrand);
  const opp = deal.opportunity || {};
  const sponsor = deal.sponsor || {};
  const stage = STAGES[deal.stage] || {};
  const editable = EDITABLE_STAGES.includes(deal.stage);
  const contracted = CONTRACTED_STAGES.includes(deal.stage);
  const proposal = deal.proposal || {};
  const deliverables = deal.deliverables || [];
  const payments = deal.payments;
  const doneCount = deliverables.filter((d) => ['DONE', 'WAIVED'].includes(d.status)).length;
  const receivedPct = deal.cashAmount > 0 ? Math.min(100, Math.round(((deal.amountReceived || 0) / deal.cashAmount) * 100)) : 0;
  const agreement = deal.agreement || {};
  const hasAgreement = agreement.documentUrl || agreement.terms || agreement.signedAt;

  const sponsorAction = async (action, body = {}, okMsg = 'Saved') => {
    setBusy(action);
    try {
      const res = await API.put(`/sponsorship/deals/${deal._id}/sponsor`, { action, ...body });
      apply(res.data.data);
      showToast(okMsg, 'success');
      return true;
    } catch (err) {
      showToast(errMsg(err), 'error');
      return false;
    } finally {
      setBusy('');
    }
  };

  const startEdit = async () => {
    setDraft({
      tier: deal.tier?._id || '',
      contributionTypes: proposal.contributionTypes || [],
      amount: proposal.amount ?? '',
      message: proposal.message || '',
      inKind: (deal.inKindItems || []).filter((i) => i.status !== 'CANCELLED').map((i) => ({
        type: i.type,
        description: i.description,
        quantity: i.quantity || '',
        unit: i.unit || '',
        estimatedValue: i.estimatedValue ?? '',
        valuationMethod: i.valuationMethod || 'NOT_VALUED',
      })),
    });
    setEditing(true);
    try {
      const r = await API.get(`/sponsorship/opportunities/${opp._id}`);
      setTiers(r.data?.data?.tiers || []);
    } catch {
      setTiers(deal.tier ? [deal.tier] : []);
    }
  };

  const saveProposal = async (e) => {
    e.preventDefault();
    if (!draft.tier && !draft.message.trim()) {
      showToast('Describe your custom package in the message.', 'warning');
      return;
    }
    const items = cleanInKind(draft.inKind);
    const ok = await sponsorAction(
      'UPDATE_PROPOSAL',
      {
        tier: draft.tier || null,
        contributionTypes: [...new Set([...draft.contributionTypes, ...items.map((i) => i.type)])],
        amount: Number(draft.amount) || 0,
        message: draft.message.trim(),
        inKindItems: items,
      },
      'Proposal updated. The team has been notified.'
    );
    if (ok) setEditing(false);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const body = msg.trim();
    if (!body) return;
    setBusy('MSG');
    try {
      const res = await API.post(`/sponsorship/deals/${deal._id}/messages`, { body });
      apply(res.data.data);
      setMsg('');
    } catch (err) {
      showToast(errMsg(err, 'Message not sent'), 'error');
    } finally {
      setBusy('');
    }
  };

  const setLogo = () => {
    if (!isHttpUrl(logoInput)) {
      showToast('Use a logo link that starts with http:// or https://', 'warning');
      return;
    }
    sponsorAction('SET_LOGO', { logoUrl: logoInput.trim() }, 'Logo saved. Approve it below so it can be used.');
  };

  const withdraw = async () => {
    const ok = await sponsorAction('WITHDRAW', { note: withdrawNote.trim() }, 'Proposal withdrawn');
    if (ok) {
      setWithdrawOpen(false);
      setWithdrawNote('');
    }
  };

  const tierLvl = deal.tier ? TIER_LEVELS[deal.tier.level] || TIER_LEVELS.CUSTOM : null;
  const report = deal.report;
  const showReport = report && (report.sharedAt || (isStaffOnly && report.summary));

  return (
    <div className="pb-10">
      <style>{PRINT_CSS}</style>

      {/* ============ HEADER ============ */}
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-6 pb-8 sm:pb-10 space-y-6">
          <BackLink to="/sponsor/portal">Sponsor portal</BackLink>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-rise">
            <div className="flex items-start gap-4 min-w-0">
              <LogoTile url={deal.logoUrl || sponsor.logos?.[0]?.url} name={sponsor.name} className="w-16 h-16 sm:w-20 sm:h-20 shadow-[var(--shadow-soft)]" />
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Chip map={STAGES} value={deal.stage} />
                  {deal.tier ? <span className={`chip ${tierLvl.cls}`}>{deal.tier.name}</span> : <span className="chip bg-brand-tint text-brand">Custom package</span>}
                  {v.sponsorRole === 'VIEWER' && <span className="chip bg-paper-deep text-ink-soft"><Eye className="w-3.5 h-3.5" aria-hidden="true" /> View only</span>}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight break-words">{opp.title}</h1>
                <p className="text-muted">
                  {sponsor._id && v.isSponsor ? (
                    <Link to={`/sponsor/portal/accounts/${sponsor._id}`} className="font-semibold text-ink-soft hover:text-brand">{sponsor.name}</Link>
                  ) : (
                    <span className="font-semibold text-ink-soft">{sponsor.name}</span>
                  )}
                  {' · '}Applied {fmtDate(deal.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`/sponsor/opportunities/${opp._id}`} className="btn btn-ghost btn-sm"><ExternalLink className="w-4 h-4" aria-hidden="true" /> Campaign page</Link>
              {canEdit && editable && (
                <button type="button" onClick={() => setWithdrawOpen(true)} className="btn btn-sm text-muted hover:text-brand hover:bg-brand-tint">
                  <Undo2 className="w-4 h-4" aria-hidden="true" /> Withdraw
                </button>
              )}
            </div>
          </div>
          <div className="card p-4 sm:p-5 space-y-4">
            <Stepper stage={deal.stage} />
            <p className="text-sm text-ink-soft flex items-start gap-2">
              <Info className="w-4 h-4 text-sky-ink mt-0.5 shrink-0" aria-hidden="true" />
              <span><strong className="text-ink">Next:</strong> {stage.next}</span>
            </p>
            {isStaffOnly && (
              <p className="text-sm text-marigold-text bg-marigold-tint rounded-xl p-3">
                You're viewing the sponsor's page as staff. Manage this deal from the{' '}
                {v.isManager || v.isFinance || v.isBrand ? <Link to={`/admin?tab=sponsorDeals&deal=${deal._id}`} className="font-semibold underline">admin dashboard</Link> : <Link to={`/organize/${opp._id}`} className="font-semibold underline">organiser workspace</Link>}.
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="container-page pt-8 grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* ============ MAIN COLUMN ============ */}
        <div className="lg:col-span-2 space-y-6 min-w-0">
          {/* Proposal */}
          <Panel
            id="proposal-h"
            icon={Pencil}
            title="Your proposal"
            action={canEdit && editable && !editing && (
              <button type="button" onClick={startEdit} className="btn btn-ghost btn-sm"><Pencil className="w-4 h-4" aria-hidden="true" /> Edit proposal</button>
            )}
          >
            {editing && draft ? (
              <form onSubmit={saveProposal} className="space-y-5" noValidate>
                <div>
                  <label htmlFor="ed-tier" className="field-label">Package</label>
                  <select id="ed-tier" className="field" value={draft.tier} onChange={(e) => setDraft({ ...draft, tier: e.target.value })}>
                    <option value="">Custom package</option>
                    {tiers.map((t) => (
                      <option key={t._id} value={t._id} disabled={t.slotsLeft === 0 && t._id !== deal.tier?._id}>
                        {t.name} — {t.price > 0 ? npr(t.price) : t.priceNote || 'by quotation'}{t.slotsLeft === 0 ? ' (sold out)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <TypeToggles legend="Contribution types" value={draft.contributionTypes} onChange={(c) => setDraft({ ...draft, contributionTypes: c })} />
                <div className="max-w-xs">
                  <label htmlFor="ed-amount" className="field-label">Proposed cash (NPR)</label>
                  <input id="ed-amount" type="number" min="0" inputMode="numeric" className="field" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                </div>
                <div>
                  <p className="field-label">In-kind items</p>
                  <InKindEditor items={draft.inKind} onChange={(inKind) => setDraft({ ...draft, inKind })} idPrefix="ed-ik" />
                </div>
                <div>
                  <label htmlFor="ed-msg" className="field-label">Message</label>
                  <textarea id="ed-msg" className="field min-h-[110px]" maxLength={4000} value={draft.message} onChange={(e) => setDraft({ ...draft, message: e.target.value })} />
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">Cancel</button>
                  <button type="submit" disabled={busy === 'UPDATE_PROPOSAL'} className="btn btn-primary">
                    {busy === 'UPDATE_PROPOSAL' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Save proposal
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-5">
                <dl className="grid sm:grid-cols-3 gap-4">
                  <div className="surface-sunken p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Package</dt>
                    <dd className="font-semibold text-ink mt-1">{deal.tier ? deal.tier.name : 'Custom package'}</dd>
                  </div>
                  <div className="surface-sunken p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Proposed cash</dt>
                    <dd className="font-display text-lg font-bold text-ink mt-1">{proposal.amount !== undefined ? npr(proposal.amount) : '—'}</dd>
                  </div>
                  <div className="surface-sunken p-4">
                    <dt className="text-xs font-semibold uppercase tracking-wider text-muted">Contributing</dt>
                    <dd className="text-sm text-ink mt-1">{(proposal.contributionTypes || []).map((t) => RESOURCE_TYPES[t] || t).join(', ') || '—'}</dd>
                  </div>
                </dl>
                {proposal.message && (
                  <blockquote className="border-l-4 border-marigold pl-4 text-ink-soft whitespace-pre-line">{proposal.message}</blockquote>
                )}
                {!contracted && deal.inKindItems?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-ink mb-2">In-kind offer</h3>
                    <InKindList items={deal.inKindItems} />
                  </div>
                )}
                {!editable && <p className="text-xs text-muted">The proposal can no longer be edited at this stage. Message the team for changes.</p>}
              </div>
            )}
          </Panel>

          {/* Agreed terms */}
          {(contracted || deal.cashAmount > 0 || hasAgreement) && (
            <Panel id="terms-h" icon={FileSignature} title="Agreed terms">
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-pine-tint to-white border border-pine/15">
                    <p className="text-xs font-semibold uppercase tracking-wider text-pine">Contracted cash</p>
                    <p className="font-display text-3xl font-bold text-ink mt-1">{deal.cashAmount !== undefined ? npr(deal.cashAmount) : '—'}</p>
                  </div>
                  <div className="rounded-2xl p-5 bg-gradient-to-br from-marigold-tint to-white border border-marigold/20">
                    <p className="text-xs font-semibold uppercase tracking-wider text-marigold-text">In-kind (estimated value — not cash)</p>
                    <p className="font-display text-3xl font-bold text-ink mt-1">{deal.inKindEstimatedValue !== undefined ? npr(deal.inKindEstimatedValue) : '—'}</p>
                  </div>
                </div>
                {deal.inKindItems?.length > 0 && <InKindList items={deal.inKindItems} />}
                {hasAgreement ? (
                  <div className="surface-sunken p-4 space-y-2">
                    {agreement.terms && <p className="text-sm text-ink-soft whitespace-pre-line">{agreement.terms}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {agreement.signedAt && (
                        <span className="chip bg-pine-tint text-pine"><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Signed {fmtDate(agreement.signedAt)}{agreement.signedByName ? ` by ${agreement.signedByName}` : ''}</span>
                      )}
                      {safeUrl(agreement.documentUrl) && (
                        <a href={safeUrl(agreement.documentUrl)} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm"><FileSignature className="w-4 h-4" aria-hidden="true" /> Open agreement</a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">The written agreement will appear here once the team uploads it.</p>
                )}
              </div>
            </Panel>
          )}

          {/* Deliverables */}
          {(contracted || deliverables.length > 0) && (
            <Panel id="deliv-h" icon={ListChecks} title="Deliverables" action={deliverables.length > 0 && <span className="chip bg-paper-deep text-ink-soft">{doneCount} of {deliverables.length} complete</span>}>
              {deliverables.length === 0 ? (
                <p className="text-sm text-muted">The team will list what they'll deliver for you (vest logos, banners, posts…) here.</p>
              ) : (
                <ul className="space-y-3">
                  {deliverables.map((d) => {
                    const done = ['DONE', 'WAIVED'].includes(d.status);
                    return (
                      <li key={d._id} className="flex items-start gap-3 p-4 rounded-2xl border border-sand bg-white">
                        {done ? <CheckCircle2 className="w-5 h-5 text-pine mt-0.5 shrink-0" aria-hidden="true" /> : <Circle className="w-5 h-5 text-sand mt-0.5 shrink-0" aria-hidden="true" />}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-ink">{d.title}</span>
                            <Chip map={DELIVERABLE_STATUS} value={d.status} />
                          </div>
                          <p className="text-xs text-muted">
                            {DELIVERABLE_TYPES[d.type] || d.type}
                            {d.dueDate ? ` · due ${fmtDate(d.dueDate)}` : ''}
                            {d.completedAt ? ` · completed ${fmtDate(d.completedAt)}` : ''}
                          </p>
                          {d.proofNote && <p className="text-sm text-ink-soft">{d.proofNote}</p>}
                          {d.proofUrls?.filter(isHttpUrl).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {d.proofUrls.filter(isHttpUrl).map((u, i) => (
                                <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="chip bg-sky-tint text-sky-ink hover:underline">
                                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> Proof {i + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          )}

          {/* Impact report */}
          {showReport && (
            <section id="impact-report" aria-labelledby="report-h" className="card p-6 sm:p-8 space-y-5 bg-gradient-to-b from-white to-paper">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="eyebrow">Impact report</span>
                  <h2 id="report-h" className="text-2xl sm:text-3xl font-bold text-ink mt-1">{opp.title}</h2>
                  <p className="text-sm text-muted mt-1">
                    Prepared for {sponsor.name}
                    {report.sharedAt ? ` · shared ${fmtDate(report.sharedAt)}` : ' · not yet shared with the sponsor'}
                  </p>
                </div>
                <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm no-print"><Printer className="w-4 h-4" aria-hidden="true" /> Print / save PDF</button>
              </div>
              {report.summary && <div className="text-ink-soft leading-relaxed whitespace-pre-line">{report.summary}</div>}
              {report.highlights?.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-3">
                  {report.highlights.map((h, i) => (
                    <li key={i} className="surface-sunken p-4 flex gap-3 text-sm text-ink-soft"><LineChart className="w-4 h-4 text-pine mt-0.5 shrink-0" aria-hidden="true" /> {h}</li>
                  ))}
                </ul>
              )}
              {report.mediaUrls?.filter(isHttpUrl).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {report.mediaUrls.filter(isHttpUrl).map((u, i) => (
                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="chip bg-sky-tint text-sky-ink hover:underline"><ImageIcon className="w-3.5 h-3.5" aria-hidden="true" /> Media {i + 1}</a>
                  ))}
                </div>
              )}
              <div className="grid sm:grid-cols-3 gap-3 text-sm pt-4 border-t border-sand">
                {deal.cashAmount !== undefined && <p><span className="text-muted block">Cash contracted</span><strong className="text-ink">{npr(deal.cashAmount)}</strong></p>}
                {deal.inKindEstimatedValue > 0 && <p><span className="text-muted block">In-kind (estimated value — not cash)</span><strong className="text-ink">{npr(deal.inKindEstimatedValue)}</strong></p>}
                {deliverables.length > 0 && <p><span className="text-muted block">Deliverables</span><strong className="text-ink">{doneCount} of {deliverables.length} complete</strong></p>}
              </div>
            </section>
          )}

          {/* Brand kit */}
          {contracted && (
            <Panel
              id="kit-h"
              icon={Palette}
              title="Campaign branding preview"
              action={!showKit && <button type="button" onClick={() => setShowKit(true)} className="btn btn-ghost btn-sm"><Eye className="w-4 h-4" aria-hidden="true" /> Show preview</button>}
            >
              {showKit ? <BrandKitPreview opportunityId={opp._id} /> : <p className="text-sm text-muted">See how sponsor logos are laid out on vests, banners, backdrops and ID cards for this campaign.</p>}
            </Panel>
          )}

          {/* Messages */}
          <Panel id="msg-h" icon={MessageSquare} title="Messages with the Hateymalo team">
            <div ref={threadRef} className="max-h-[28rem] overflow-y-auto space-y-3 pr-1 -mr-1" aria-live="polite">
              {(deal.messages || []).length === 0 ? (
                <p className="text-sm text-muted">No messages yet. Ask a question or share details about your proposal.</p>
              ) : (
                deal.messages.map((m) => {
                  const mine = m.authorSide === 'SPONSOR';
                  return (
                    <div key={m._id} className={`flex gap-3 ${mine ? 'flex-row-reverse' : ''}`}>
                      <Avatar name={m.author?.name} src={m.author?.profilePicture} size="sm" />
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${m.internal ? 'bg-marigold-tint border border-marigold/30' : mine ? 'bg-ink text-white' : 'bg-paper-deep text-ink'}`}>
                        <p className={`text-xs mb-1 ${mine && !m.internal ? 'text-white/70' : 'text-muted'}`}>
                          {m.author?.name || 'Someone'} · {m.authorSide === 'HATEYMALO' ? 'Hateymalo' : sponsor.name} · {fmtDateTime(m.at)}
                          {m.internal && ' · Internal note'}
                        </p>
                        <p className="text-sm whitespace-pre-line break-words">{m.body}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {canEdit ? (
              <form onSubmit={sendMessage} className="mt-4 flex flex-col sm:flex-row gap-3">
                <label htmlFor="deal-msg" className="sr-only">Message</label>
                <textarea id="deal-msg" rows={2} maxLength={3000} className="field flex-1 min-h-[52px]" placeholder="Write a message…" value={msg} onChange={(e) => setMsg(e.target.value)} />
                <button type="submit" disabled={busy === 'MSG' || !msg.trim()} className="btn btn-primary sm:self-end">
                  {busy === 'MSG' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />} Send
                </button>
              </form>
            ) : (
              v.sponsorRole === 'VIEWER' && <p className="text-xs text-muted mt-4">You have view-only access to this sponsor account.</p>
            )}
          </Panel>
        </div>

        {/* ============ SIDEBAR ============ */}
        <aside className="space-y-6 min-w-0">
          {/* Logo */}
          <Panel id="logo-h" icon={ImageIcon} title="Your logo">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <LogoTile url={deal.logoUrl} name={sponsor.name} className="w-24 h-24" />
                <div className="space-y-1.5">
                  {deal.logoUsageApproved ? (
                    <span className="chip bg-pine-tint text-pine"><BadgeCheck className="w-3.5 h-3.5" aria-hidden="true" /> Approved for use</span>
                  ) : deal.logoUrl ? (
                    <span className="chip bg-marigold-tint text-marigold-text">Awaiting your approval</span>
                  ) : (
                    <span className="chip bg-paper-deep text-ink-soft">No logo chosen</span>
                  )}
                  {deal.logoApprovedAt && <p className="text-xs text-muted">Approved {fmtDate(deal.logoApprovedAt)}</p>}
                </div>
              </div>

              {canEdit && (
                <>
                  {sponsor.logos?.length > 0 && (
                    <div>
                      <p className="field-label">Choose from your account</p>
                      <div className="flex flex-wrap gap-2">
                        {sponsor.logos.map((l) => (
                          <button
                            key={l._id || l.url}
                            type="button"
                            aria-pressed={logoInput === l.url}
                            onClick={() => setLogoInput(l.url)}
                            title={l.label}
                            className={`rounded-2xl border p-1 ${logoInput === l.url ? 'border-brand ring-2 ring-brand/20' : 'border-sand hover:border-ink/30'}`}
                          >
                            <LogoTile url={l.url} name={l.label || sponsor.name} className="w-12 h-12 !border-0" dark={l.background === 'DARK'} />
                            <span className="sr-only">{l.label || 'Logo'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <UrlPreviewField id="deal-logo" label="Logo link" value={logoInput} onChange={setLogoInput} name={sponsor.name} preview={false} hint="Changing the logo clears any earlier approval." />
                  <button type="button" onClick={setLogo} disabled={busy === 'SET_LOGO' || !logoInput || logoInput === deal.logoUrl} className="btn btn-ghost btn-sm w-full">
                    {busy === 'SET_LOGO' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Use this logo
                  </button>

                  {deal.logoUrl && !deal.logoUsageApproved && (
                    <div className="surface-sunken p-4 space-y-3">
                      <label className="flex items-start gap-3 text-sm text-ink-soft">
                        <input type="checkbox" className="w-4 h-4 mt-1 accent-[var(--color-pine)] shrink-0" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                        <span>On behalf of {sponsor.name}, I confirm we own this logo and allow Hateymalo to use it on this campaign's vests, banners, ID cards, signage and social posts.</span>
                      </label>
                      <button type="button" onClick={() => sponsorAction('APPROVE_LOGO', {}, 'Logo use approved')} disabled={!consent || busy === 'APPROVE_LOGO'} className="btn btn-pine btn-sm w-full">
                        {busy === 'APPROVE_LOGO' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <BadgeCheck className="w-4 h-4" aria-hidden="true" />} Approve logo use
                      </button>
                    </div>
                  )}
                  {deal.logoUsageApproved && (
                    <button type="button" onClick={() => sponsorAction('REVOKE_LOGO', {}, 'Logo approval withdrawn')} disabled={busy === 'REVOKE_LOGO'} className="btn btn-sm w-full text-muted hover:text-brand hover:bg-brand-tint">
                      <ShieldOff className="w-4 h-4" aria-hidden="true" /> Withdraw logo approval
                    </button>
                  )}
                </>
              )}
            </div>
          </Panel>

          {/* Payments */}
          {payments !== undefined && (contracted || payments.length > 0) && (
            <Panel id="pay-h" icon={Receipt} title="Payments">
              <div className="space-y-4">
                <div>
                  <div className="flex items-baseline justify-between text-sm mb-2">
                    <span><strong className="font-display text-lg text-ink">{npr(deal.amountReceived)}</strong> <span className="text-muted">received</span></span>
                    <span className="text-muted">of {npr(deal.cashAmount)}</span>
                  </div>
                  <div className="progress-track" role="progressbar" aria-valuenow={receivedPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${receivedPct}% of contracted cash received`}>
                    <div className="progress-fill !bg-none !bg-pine" style={{ width: `${receivedPct}%` }} />
                  </div>
                </div>
                {payments.length === 0 ? (
                  <p className="text-sm text-muted">No payments recorded yet. Receipts appear here once the finance team logs them.</p>
                ) : (
                  <ul className="divide-y divide-sand">
                    {payments.map((p) => (
                      <li key={p._id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-ink">{npr(p.amount)}</p>
                          <p className="text-xs text-muted break-words">
                            {PAYMENT_METHODS[p.method] || p.method}{p.reference ? ` · Ref ${p.reference}` : ''}
                          </p>
                          {p.note && <p className="text-xs text-ink-soft">{p.note}</p>}
                        </div>
                        <span className="text-xs text-muted shrink-0">{fmtDate(p.receivedAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Panel>
          )}

          {/* History */}
          <Panel id="hist-h" icon={ListChecks} title="Timeline">
            <ol className="relative border-l-2 border-sand ml-2 space-y-5">
              {(deal.history || []).slice().reverse().map((h, i) => (
                <li key={h._id || i} className="pl-5 relative">
                  <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full ring-4 ring-white ${i === 0 ? 'bg-brand' : 'bg-sand'}`} aria-hidden="true" />
                  <Chip map={STAGES} value={h.stage} />
                  {h.note && <p className="text-sm text-ink-soft mt-1">{h.note}</p>}
                  <p className="text-xs text-muted mt-0.5">{h.by?.name ? `${h.by.name} · ` : ''}{fmtDateTime(h.at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </aside>
      </div>

      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} labelledBy="withdraw-title">
        <div className="p-6 sm:p-8 space-y-4">
          <h2 id="withdraw-title" className="text-2xl font-bold text-ink pr-10">Withdraw this proposal?</h2>
          <p className="text-muted text-sm">The team will be told you've withdrawn from “{opp.title}”. You can apply again later from the campaign page.</p>
          <div>
            <label htmlFor="withdraw-note" className="field-label">Reason (optional)</label>
            <textarea id="withdraw-note" className="field min-h-[90px]" maxLength={500} value={withdrawNote} onChange={(e) => setWithdrawNote(e.target.value)} />
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={() => setWithdrawOpen(false)} className="btn btn-ghost">Keep proposal</button>
            <button type="button" onClick={withdraw} disabled={busy === 'WITHDRAW'} className="btn btn-primary">
              {busy === 'WITHDRAW' && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Withdraw proposal
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SponsorDeal;
