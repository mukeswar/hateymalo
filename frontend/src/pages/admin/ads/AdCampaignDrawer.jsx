import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Pause, Play, XCircle } from 'lucide-react';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AdView } from '../../../components/ads/AdSlot';
import AdReport from '../../../components/ads/AdReport';
import SubjectInvoices from '../revenue/SubjectInvoices';
import {
  CREATIVE_STATUS, DELIVERY, FORMAT_LABELS, OBJECTIVE_LABELS, SURFACE_LABELS,
  AdChip, num, nprAd, pct, previewAd, priceLine,
} from '../../../components/ads/adShared';
import { BTN_DANGER, BTN_GHOST, BTN_PINE, BTN_PRIMARY, Drawer, Field, Loading, NoteDialog, SubTabs, Chip, dateRange, errMsg, fmtDateTime } from '../sponsorship/shared';

/**
 * Staff view of one ad campaign: review (approve / reject, per creative),
 * pause / resume, custom pricing for ad managers, report and history.
 */
const AdCampaignDrawer = ({ campaignId, onClose, onChanged }) => {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('review');
  const [decisions, setDecisions] = useState({}); // creativeId -> { status, reason }
  const [dialog, setDialog] = useState(null); // 'REJECT' | 'APPROVE' | 'PAUSE' | 'RESUME'
  const [price, setPrice] = useState({ flatPrice: '', rate: '', budget: '' });
  const [savingPrice, setSavingPrice] = useState(false);

  const apply = (data) => {
    setC(data);
    setDecisions({});
    setPrice({ flatPrice: data.flatPrice ?? '', rate: data.rate ?? '', budget: data.budget ?? '' });
  };

  const load = () =>
    API.get(`/ads/campaigns/${campaignId}`)
      .then((r) => apply(r.data.data))
      .catch((e) => setError(errMsg(e, 'Could not load the campaign')));

  useEffect(() => {
    setC(null);
    setError('');
    setTab('review');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const done = (res) => {
    showToast(res.data.message || 'Saved', 'success');
    apply({ ...res.data.data, history: undefined });
    load(); // brings back history with names
    onChanged?.(res.data.data);
  };

  const review = async (decision, reason = '') => {
    try {
      const creatives = Object.entries(decisions).filter(([, d]) => d.status).map(([_id, d]) => ({ _id, status: d.status, reason: d.reason || '' }));
      const res = await API.put(`/ads/campaigns/${campaignId}/review`, { decision, reason, creatives });
      done(res);
      setDialog(null);
    } catch (e) {
      showToast(errMsg(e, 'Review failed'), 'error');
    }
  };

  const changeStatus = async (action, note) => {
    try {
      const res = await API.post(`/ads/campaigns/${campaignId}/status`, { action, note });
      done(res);
      setDialog(null);
    } catch (e) {
      showToast(errMsg(e, 'Could not change the status'), 'error');
    }
  };

  const savePrice = async (e) => {
    e.preventDefault();
    setSavingPrice(true);
    try {
      const body = c.pricingModel === 'FLAT' ? { flatPrice: Number(price.flatPrice) || 0 } : { rate: Number(price.rate) || 0, budget: Number(price.budget) || 0 };
      const res = await API.put(`/ads/campaigns/${campaignId}`, body);
      done(res);
    } catch (err) {
      showToast(errMsg(err, 'Could not save the price'), 'error');
    } finally {
      setSavingPrice(false);
    }
  };

  const setDecision = (id, patch) => setDecisions((d) => ({ ...d, [id]: { ...(d[id] || {}), ...patch } }));

  const v = c?.viewer || {};
  const canReview = can('canReviewAds');
  const canManage = can('canManageAds');
  const inReview = c?.status === 'IN_REVIEW';
  const unverified = c && c.advertiser?.verificationStatus !== 'VERIFIED';
  const tabs = [
    { id: 'review', label: inReview ? 'Review' : 'Creatives' },
    { id: 'details', label: 'Details & pricing' },
    { id: 'report', label: 'Report' },
    { id: 'history', label: 'History' },
    ...(can('canManageRevenue') ? [{ id: 'invoices', label: 'Invoices' }] : []),
  ];
  const invoiceable = c && ['APPROVED', 'PAUSED', 'ENDED', 'ARCHIVED'].includes(c.status) && (c.bookedValue || 0) > 0;

  return (
    <Drawer
      title={c?.title || 'Ad campaign'}
      onClose={onClose}
      subtitle={c ? `${c.advertiser?.name || ''} · ${dateRange(c.startDate, c.endDate)}` : ''}
      headerExtra={
        c && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <AdChip value={c.deliveryStatus} />
            {c.pausedByStaff && <span className="chip bg-brand-tint text-brand">Paused by staff</span>}
            <a href={`/sponsor/ads/${c._id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-ink hover:underline">
              Advertiser view <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        )
      }
    >
      {error ? (
        <p className="p-6 text-sm text-brand">{error}</p>
      ) : !c ? (
        <Loading>Loading campaign…</Loading>
      ) : (
        <div className="space-y-5 p-4 sm:p-6">
          {/* Status actions */}
          <div className="flex flex-wrap gap-2">
            {canReview && inReview && (
              <>
                <button type="button" onClick={() => setDialog('APPROVE')} disabled={unverified} className={BTN_PINE} title={unverified ? 'Verify the sponsor account first' : undefined}>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Approve
                </button>
                <button type="button" onClick={() => setDialog('REJECT')} className={BTN_DANGER}>
                  <XCircle className="h-4 w-4" aria-hidden="true" /> Reject
                </button>
              </>
            )}
            {canReview && c.status === 'APPROVED' && (
              <button type="button" onClick={() => setDialog('PAUSE')} className={BTN_GHOST}>
                <Pause className="h-4 w-4" aria-hidden="true" /> Pause
              </button>
            )}
            {canReview && c.status === 'PAUSED' && (
              <button type="button" onClick={() => setDialog('RESUME')} className={BTN_PINE}>
                <Play className="h-4 w-4" aria-hidden="true" /> Resume
              </button>
            )}
          </div>

          {unverified && (
            <p className="flex gap-2 rounded-2xl bg-marigold-tint p-3 text-sm text-marigold-text" role="note">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                The sponsor account “{c.advertiser?.name}” is <strong>{(c.advertiser?.verificationStatus || '').toLowerCase()}</strong>. Verify it in Sponsor accounts before approving its ads.
              </span>
            </p>
          )}
          {c.status === 'REJECTED' && c.rejectionReason && <p className="rounded-2xl bg-brand-tint p-3 text-sm text-brand"><strong>Rejected:</strong> {c.rejectionReason}</p>}
          {c.status === 'PAUSED' && c.pauseNote && <p className="rounded-2xl bg-marigold-tint p-3 text-sm text-marigold-text"><strong>Pause note:</strong> {c.pauseNote}</p>}

          <SubTabs tabs={tabs} value={tab} onChange={setTab} ariaLabel="Campaign sections" />

          {tab === 'review' && (
            <div className="space-y-4">
              {inReview && canReview && (
                <p className="text-sm text-muted">
                  Approving approves every creative still waiting unless you reject it here. Rejected creatives need a reason the advertiser can act on.
                </p>
              )}
              {(c.creatives || []).length === 0 && <p className="text-sm text-muted">No creatives.</p>}
              {(c.creatives || []).map((k) => {
                const d = decisions[k._id];
                const pid = `rv-${k._id}`;
                return (
                  <div key={k._id} className="card space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-ink">{k.name}</span>
                      <span className="text-xs text-muted">{FORMAT_LABELS[k.format]}</span>
                      <AdChip map={CREATIVE_STATUS} value={k.status} />
                      {!k.isActive && <span className="chip bg-paper-deep text-muted">Turned off</span>}
                    </div>
                    {k.rejectionReason && k.status === 'REJECTED' && <p className="text-sm text-brand">Reason: {k.rejectionReason}</p>}
                    <div className="rounded-2xl border border-dashed border-sand bg-paper p-3">
                      <AdView ad={previewAd(k, c.advertiser?.name)} preview layout="wide" />
                    </div>
                    <p className="break-all text-xs text-muted">
                      {k.format === 'VIDEO' ? `Video: ${k.videoUrl}` : `Image: ${k.imageUrl}`}
                    </p>
                    {inReview && canReview && (
                      <div className="space-y-2">
                        <div role="group" aria-label={`Decision for ${k.name}`} className="flex flex-wrap gap-2">
                          {[
                            ['', 'Decide with campaign'],
                            ['APPROVED', 'Approve'],
                            ['REJECTED', 'Reject'],
                          ].map(([s, l]) => (
                            <button
                              key={s || 'none'}
                              type="button"
                              aria-pressed={(d?.status || '') === s}
                              onClick={() => setDecision(k._id, { status: s })}
                              className={`chip !py-1.5 !px-3.5 border ${(d?.status || '') === s ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
                            >
                              {l}
                            </button>
                          ))}
                        </div>
                        {d?.status === 'REJECTED' && (
                          <Field id={pid} label="Reason for the advertiser">
                            <input id={pid} className="field" maxLength={500} value={d.reason || ''} onChange={(e) => setDecision(k._id, { reason: e.target.value })} placeholder="e.g. Text in the image is too small to read" />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-5">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-xs text-muted">Advertiser</dt><dd className="flex flex-wrap items-center gap-2 font-semibold">{c.advertiser?.name} <Chip status={c.advertiser?.verificationStatus} /></dd></div>
                <div><dt className="text-xs text-muted">Goal</dt><dd>{OBJECTIVE_LABELS[c.objective]}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted">Destination</dt>
                  <dd className="break-all">
                    <a href={c.destinationUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-ink hover:underline">{c.destinationUrl}</a>
                    {c.appendUtm && <span className="block text-xs text-muted">UTM tags added</span>}
                  </dd>
                </div>
                <div><dt className="text-xs text-muted">Placements</dt><dd className="font-mono text-xs">{c.placements?.join(', ') || '—'}</dd></div>
                <div><dt className="text-xs text-muted">Surfaces</dt><dd>{(c.surfaces || []).map((s) => SURFACE_LABELS[s]).join(', ')}</dd></div>
                <div><dt className="text-xs text-muted">Causes</dt><dd>{c.categories?.length ? c.categories.join(', ') : 'Not targeted'}</dd></div>
                <div><dt className="text-xs text-muted">Frequency cap</dt><dd>{c.frequencyCapPerDay ? `${c.frequencyCapPerDay}/device/day` : 'None'}</dd></div>
                <div><dt className="text-xs text-muted">Price</dt><dd>{priceLine(c)}{c.customPrice ? ' (custom)' : ''}</dd></div>
                <div><dt className="text-xs text-muted">Spend / booked</dt><dd className="tabular-nums">{nprAd(c.spend)} / {nprAd(c.bookedValue)}</dd></div>
                <div><dt className="text-xs text-muted">Impressions · clicks · CTR</dt><dd className="tabular-nums">{num(c.totals?.impressions)} · {num(c.totals?.clicks)} · {pct(c.ctr)}</dd></div>
                {c.description && <div className="sm:col-span-2"><dt className="text-xs text-muted">Advertiser notes</dt><dd className="whitespace-pre-line text-ink-soft">{c.description}</dd></div>}
              </dl>

              {canManage && v.canEdit && (
                <form onSubmit={savePrice} className="space-y-3 rounded-2xl border border-sand bg-white p-4">
                  <p className="font-semibold text-ink">Custom price</p>
                  <p className="text-xs text-muted">
                    Overrides the rate-card quote. It is kept while the advertiser leaves pricing model, placements and dates alone.
                    {!canReview && ['APPROVED', 'PAUSED'].includes(c.status) && ' Without review permission, changing the price of an approved campaign sends it back to review.'}
                  </p>
                  {c.pricingModel === 'FLAT' ? (
                    <Field id="ad-flat" label="Flat price for the whole run (NPR)">
                      <input id="ad-flat" type="number" min="0" inputMode="numeric" className="field" value={price.flatPrice} onChange={(e) => setPrice({ ...price, flatPrice: e.target.value })} />
                    </Field>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field id="ad-rate" label={c.pricingModel === 'CPM' ? 'Rate per 1,000 impressions (NPR)' : 'Rate per click (NPR)'}>
                        <input id="ad-rate" type="number" min="0" inputMode="numeric" className="field" value={price.rate} onChange={(e) => setPrice({ ...price, rate: e.target.value })} />
                      </Field>
                      <Field id="ad-budget" label="Budget (NPR)">
                        <input id="ad-budget" type="number" min="0" inputMode="numeric" className="field" value={price.budget} onChange={(e) => setPrice({ ...price, budget: e.target.value })} />
                      </Field>
                    </div>
                  )}
                  <button type="submit" disabled={savingPrice} className={BTN_PRIMARY}>{savingPrice ? 'Saving…' : 'Save price'}</button>
                </form>
              )}
            </div>
          )}

          {tab === 'report' && <AdReport campaignId={c._id} title={c.title} />}

          {tab === 'invoices' && can('canManageRevenue') && (
            <SubjectInvoices campaign={c} canInvoice={invoiceable} blockedNote="Only approved campaigns with a booked value can be invoiced." />
          )}

          {tab === 'history' && (
            <ol className="space-y-3 border-l border-sand pl-4">
              {(c.history || []).slice().reverse().map((h, i) => (
                <li key={i} className="text-sm">
                  <span className="flex flex-wrap items-center gap-2">
                    <AdChip map={DELIVERY} value={h.status} />
                    <span className="text-xs text-muted">{fmtDateTime(h.at)}</span>
                  </span>
                  {h.note && <span className="mt-1 block break-words text-ink-soft">{h.note}</span>}
                  {h.by?.name && <span className="block text-xs text-muted">by {h.by.name}</span>}
                </li>
              ))}
              {!(c.history || []).length && <li className="text-sm text-muted">No history yet.</li>}
            </ol>
          )}
        </div>
      )}

      {dialog === 'APPROVE' && (
        <NoteDialog
          title="Approve this campaign?"
          message={`It starts showing from the start date. ${Object.values(decisions).filter((d) => d.status === 'REJECTED').length} creative(s) marked as rejected.`}
          fieldLabel="Note for the advertiser (optional)"
          confirmLabel="Approve"
          onCancel={() => setDialog(null)}
          onConfirm={(note) => review('APPROVE', note)}
        />
      )}
      {dialog === 'REJECT' && (
        <NoteDialog
          title="Reject this campaign?"
          message="The advertiser sees this reason and can edit and submit again."
          fieldLabel="Reason (required)"
          confirmLabel="Reject"
          required
          danger
          onCancel={() => setDialog(null)}
          onConfirm={(note) => review('REJECT', note)}
        />
      )}
      {(dialog === 'PAUSE' || dialog === 'RESUME') && (
        <NoteDialog
          title={dialog === 'PAUSE' ? 'Pause this campaign?' : 'Resume this campaign?'}
          message={dialog === 'PAUSE' ? 'The ad stops showing. A pause by staff can only be lifted by staff, and the advertiser is notified.' : 'The ad starts showing again if it is within its dates and budget.'}
          fieldLabel="Note for the advertiser (optional)"
          confirmLabel={dialog === 'PAUSE' ? 'Pause' : 'Resume'}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => changeStatus(dialog, note)}
        />
      )}
    </Drawer>
  );
};

export default AdCampaignDrawer;
