import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { BackLink, Chip, LogoTile, Modal, NotFoundCard, PageSkeleton, VERIFICATION, dateRange, errMsg, fmtDateTime } from '../../components/sponsorship/shared';
import { AdView } from '../../components/ads/AdSlot';
import AdReport from '../../components/ads/AdReport';
import {
  CREATIVE_STATUS, DELIVERY, FORMAT_LABELS, OBJECTIVE_LABELS, SURFACE_LABELS,
  AdChip, advertiserActions, num, nprAd, pct, previewAd, priceLine,
} from '../../components/ads/adShared';
import { AlertTriangle, Archive, BarChart3, CircleStop, ExternalLink, Pause, Pencil, Play, Send, Trash2, Undo2 } from 'lucide-react';

const ACTIONS = {
  SUBMIT: { label: 'Submit for review', icon: Send, cls: 'btn-primary' },
  WITHDRAW: { label: 'Withdraw from review', icon: Undo2, cls: 'btn-ghost', confirm: 'The campaign goes back to draft so you can keep editing. Submit it again when it is ready.' },
  PAUSE: { label: 'Pause', icon: Pause, cls: 'btn-ghost', confirm: 'The ad stops showing until you resume it.' },
  RESUME: { label: 'Resume', icon: Play, cls: 'btn-pine' },
  END: { label: 'End campaign', icon: CircleStop, cls: 'btn-ghost', confirm: 'Ending stops the ad for good. Ended campaigns cannot be changed or restarted.', danger: true },
  ARCHIVE: { label: 'Archive', icon: Archive, cls: 'btn-ghost', confirm: 'Archived campaigns are hidden from your list (you can still show them). They cannot be changed.' },
  DELETE: { label: 'Delete', icon: Trash2, cls: 'bg-brand-tint text-brand hover:bg-brand hover:text-white', confirm: 'Deleting removes this draft permanently. Only drafts that never ran can be deleted.', danger: true },
};

/** /sponsor/ads/:id — one campaign: status, actions, creatives, history and report */
const AdCampaign = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [c, setC] = useState(null);
  const [missing, setMissing] = useState('');
  const [tab, setTab] = useState('overview');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null); // action awaiting confirmation
  const [note, setNote] = useState('');

  const load = () =>
    API.get(`/ads/campaigns/${id}`)
      .then((r) => setC(r.data.data))
      .catch((e) => setMissing(errMsg(e, 'Campaign not found')));

  useEffect(() => {
    setC(null);
    setMissing('');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (missing) return <NotFoundCard title="Campaign not available" body={missing} to="/sponsor/ads" cta="Back to ad campaigns" />;
  if (!c) return <PageSkeleton label="Loading ad campaign" />;

  const v = c.viewer || {};
  const actions = advertiserActions(c);
  const ds = DELIVERY[c.deliveryStatus] || {};
  const rejectedCreatives = (c.creatives || []).filter((k) => k.status === 'REJECTED');

  const run = async (action, noteText = '') => {
    setBusy(true);
    try {
      let res;
      if (action === 'SUBMIT') res = await API.post(`/ads/campaigns/${id}/submit`, { note: noteText });
      else if (action === 'DELETE') {
        res = await API.delete(`/ads/campaigns/${id}`);
        showToast(res.data.message || 'Campaign deleted', 'success');
        navigate('/sponsor/ads');
        return;
      } else res = await API.post(`/ads/campaigns/${id}/status`, { action, note: noteText });
      showToast(res.data.message || 'Done', 'success');
      await load();
    } catch (e) {
      const conflict = action === 'DELETE' && e?.response?.status === 409;
      showToast(errMsg(e, 'That did not work'), conflict ? 'warning' : 'error');
      if (conflict && actions.includes('ARCHIVE')) setPending('ARCHIVE');
      else setPending(null);
      return;
    } finally {
      setBusy(false);
    }
    setPending(null);
  };

  const ask = (action) => {
    setNote('');
    if (ACTIONS[action].confirm || action === 'SUBMIT') setPending(action);
    else run(action);
  };

  return (
    <div className="pb-20">
      <section className="border-b border-sand bg-paper-deep/60">
        <div className="container-page pt-8 pb-8 space-y-5">
          <BackLink to="/sponsor/ads">Ad campaigns</BackLink>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <AdChip value={c.deliveryStatus} />
                {c.customPrice && <span className="chip bg-sky-tint text-sky-ink">Agreed price</span>}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-ink leading-tight break-words">{c.title}</h1>
              <p className="text-muted">
                {OBJECTIVE_LABELS[c.objective]} · {dateRange(c.startDate, c.endDate)} · {priceLine(c)}
              </p>
              {ds.hint && <p className="text-sm text-ink-soft">{ds.hint}</p>}
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <LogoTile url={c.advertiser?.logos?.[0]?.url} name={c.advertiser?.name} className="w-8 h-8 !rounded-lg" />
                <span className="font-semibold">{c.advertiser?.name}</span>
                <Chip map={VERIFICATION} value={c.advertiser?.verificationStatus} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {v.canEdit && !['ENDED', 'ARCHIVED'].includes(c.status) && (
                <Link to={`/sponsor/ads/${id}/edit`} className="btn btn-ghost btn-sm min-h-10">
                  <Pencil className="h-4 w-4" aria-hidden="true" /> Edit
                </Link>
              )}
              {actions.map((a) => {
                const A = ACTIONS[a];
                const Icon = A.icon;
                return (
                  <button key={a} type="button" disabled={busy} onClick={() => ask(a)} className={`btn btn-sm min-h-10 ${A.cls}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" /> {A.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pt-8 space-y-6">
        {c.status === 'REJECTED' && c.rejectionReason && (
          <div className="flex gap-3 rounded-2xl bg-brand-tint p-4 text-sm text-brand" role="note">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Our team asked for changes</p>
              <p className="mt-0.5">{c.rejectionReason}</p>
              {rejectedCreatives.length > 0 && <p className="mt-1">See the notes on the rejected creatives below, then edit and submit again.</p>}
            </div>
          </div>
        )}
        {c.status === 'PAUSED' && c.pausedByStaff && (
          <div className="flex gap-3 rounded-2xl bg-marigold-tint p-4 text-sm text-marigold-text" role="note">
            <Pause className="h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              <strong>Paused by our team.</strong> {c.pauseNote || 'Message us to have it resumed.'}
            </p>
          </div>
        )}

        <div role="tablist" aria-label="Campaign sections" className="flex w-max max-w-full gap-1 overflow-x-auto rounded-full border border-sand bg-white p-1">
          {[
            ['overview', 'Overview'],
            ['report', 'Report'],
          ].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold ${tab === k ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'}`}>
              {k === 'report' && <BarChart3 className="mr-1.5 inline h-4 w-4" aria-hidden="true" />}
              {l}
            </button>
          ))}
        </div>

        {tab === 'report' ? (
          <AdReport campaignId={id} title={c.title} />
        ) : (
          <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 items-start">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <section aria-labelledby="cr-h" className="space-y-3">
                <h2 id="cr-h" className="text-2xl font-bold text-ink">Creatives</h2>
                {(c.creatives || []).length === 0 ? (
                  <p className="card p-6 text-sm text-muted text-center">No creatives yet. Edit the campaign to add one.</p>
                ) : (
                  <ul className="space-y-4">
                    {c.creatives.map((k) => (
                      <li key={k._id} className="card p-4 sm:p-5 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-ink">{k.name}</span>
                          <span className="text-xs text-muted">{FORMAT_LABELS[k.format]}</span>
                          <AdChip map={CREATIVE_STATUS} value={k.status} />
                          {!k.isActive && <span className="chip bg-paper-deep text-muted">Turned off</span>}
                        </div>
                        {k.status === 'REJECTED' && k.rejectionReason && (
                          <p className="rounded-xl bg-brand-tint px-3 py-2 text-sm text-brand"><strong>Not approved:</strong> {k.rejectionReason}</p>
                        )}
                        <div className="rounded-2xl border border-dashed border-sand bg-paper p-3">
                          <AdView ad={previewAd(k, c.advertiser?.name)} preview layout="wide" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <aside className="space-y-6">
              <section aria-labelledby="sum-h" className="card p-5 space-y-3">
                <h2 id="sum-h" className="text-lg font-bold text-ink">So far</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div><dt className="text-xs text-muted">Impressions</dt><dd className="font-display text-xl font-bold tabular-nums">{num(c.totals?.impressions)}</dd></div>
                  <div><dt className="text-xs text-muted">Viewable</dt><dd className="font-display text-xl font-bold tabular-nums">{num(c.totals?.viewable)}</dd></div>
                  <div><dt className="text-xs text-muted">Clicks</dt><dd className="font-display text-xl font-bold tabular-nums">{num(c.totals?.clicks)}</dd></div>
                  <div><dt className="text-xs text-muted">CTR</dt><dd className="font-display text-xl font-bold tabular-nums">{pct(c.ctr)}</dd></div>
                  <div><dt className="text-xs text-muted">Spend to date</dt><dd className="font-semibold tabular-nums">{nprAd(c.spend)}</dd></div>
                  <div><dt className="text-xs text-muted">Booked value</dt><dd className="font-semibold tabular-nums">{nprAd(c.bookedValue)}</dd></div>
                </dl>
                <button type="button" onClick={() => setTab('report')} className="btn btn-ghost btn-sm min-h-10 w-full">
                  <BarChart3 className="h-4 w-4" aria-hidden="true" /> Full report
                </button>
              </section>

              <section aria-labelledby="det-h" className="card p-5 space-y-3 text-sm">
                <h2 id="det-h" className="text-lg font-bold text-ink">Details</h2>
                <dl className="space-y-2.5">
                  <div>
                    <dt className="text-xs text-muted">Destination</dt>
                    <dd>
                      <a href={c.destinationUrl} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 font-semibold text-sky-ink hover:underline">
                        <span className="truncate">{c.destinationUrl}</span> <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      </a>
                      {c.appendUtm && <span className="block text-xs text-muted">Tracking tags added</span>}
                    </dd>
                  </div>
                  <div><dt className="text-xs text-muted">Placements</dt><dd className="font-mono text-xs">{c.placements?.length ? c.placements.join(', ') : 'None yet'}</dd></div>
                  <div><dt className="text-xs text-muted">Shown on</dt><dd>{(c.surfaces || []).map((s) => SURFACE_LABELS[s]).join(' and ') || '—'}</dd></div>
                  <div><dt className="text-xs text-muted">Causes</dt><dd>{c.categories?.length ? c.categories.join(', ') : 'Everywhere (not targeted)'}</dd></div>
                  <div><dt className="text-xs text-muted">Per device per day</dt><dd>{c.frequencyCapPerDay ? `${c.frequencyCapPerDay} times` : 'No limit'}</dd></div>
                </dl>
              </section>

              {(c.history || []).length > 0 && (
                <section aria-labelledby="hist-h" className="card p-5 space-y-3">
                  <h2 id="hist-h" className="text-lg font-bold text-ink">History</h2>
                  <ol className="space-y-3 border-l border-sand pl-4">
                    {c.history.slice().reverse().map((h, i) => (
                      <li key={i} className="text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <AdChip value={h.status} />
                          <span className="text-xs text-muted">{fmtDateTime(h.at)}</span>
                        </span>
                        {h.note && <span className="mt-1 block text-ink-soft break-words">{h.note}</span>}
                        {h.by?.name && <span className="block text-xs text-muted">by {h.by.name}</span>}
                      </li>
                    ))}
                  </ol>
                </section>
              )}
            </aside>
          </div>
        )}
      </div>

      <Modal open={!!pending} onClose={() => setPending(null)} labelledBy="act-title">
        {pending && (
          <form
            className="p-6 sm:p-7 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(pending, note.trim());
            }}
          >
            <h2 id="act-title" className="text-xl font-bold text-ink pr-10">{ACTIONS[pending].label}?</h2>
            <p className="text-sm text-ink-soft">{ACTIONS[pending].confirm || 'Our team reviews the campaign before it runs, usually within two working days.'}</p>
            {pending !== 'DELETE' && (
              <div>
                <label htmlFor="act-note" className="field-label">Note (optional)</label>
                <textarea id="act-note" rows={2} maxLength={500} className="field" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setPending(null)} className="btn btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} className={`btn ${ACTIONS[pending].danger ? 'bg-brand text-white hover:bg-brand-dark' : 'btn-primary'}`}>
                {busy ? 'Working…' : ACTIONS[pending].label}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdCampaign;
