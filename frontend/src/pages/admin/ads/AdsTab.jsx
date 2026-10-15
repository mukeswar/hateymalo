import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import AdCampaignDrawer from './AdCampaignDrawer';
import { AD_STATUSES, DELIVERY, AdChip, num, nprAd, pct, priceLine } from '../../../components/ads/adShared';
import { Empty, Loading, Panel, Stat, dateRange, errMsg, fmtDate } from '../sponsorship/shared';

const FILTERS = [
  { id: 'IN_REVIEW', label: 'Review queue' },
  { id: '', label: 'All (not archived)' },
  ...AD_STATUSES.filter((s) => s !== 'IN_REVIEW').map((s) => ({ id: s, label: DELIVERY[s]?.label || s })),
];

/**
 * Advertising overview for staff (canManageAds / canReviewAds / canManageSponsorFinance):
 * summary, review queue first, every campaign by status, and the campaign drawer.
 * focus = { campaign, nonce } from deep links (/admin?tab=ads&campaign=<id>).
 */
const AdsTab = ({ focus = null, onFocusHandled, search = '', refreshKey = 0 }) => {
  const { showToast } = useToast();
  const [summary, setSummary] = useState(null);
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('IN_REVIEW');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    if (!focus?.campaign) return;
    setOpenId(focus.campaign);
    onFocusHandled?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  const loadSummary = useCallback(() => {
    API.get('/ads/admin/summary')
      .then((r) => setSummary(r.data.data))
      .catch(() => setSummary(false));
  }, []);

  const load = useCallback(async () => {
    try {
      const status = filter || AD_STATUSES.filter((s) => s !== 'ARCHIVED').join(',');
      const res = await API.get('/ads/admin/campaigns', { params: { status } });
      setList(res.data.data || []);
    } catch (e) {
      setList([]);
      showToast(errMsg(e, 'Could not load ad campaigns'), 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary, refreshKey]);
  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Open on the full list when nothing is waiting
  useEffect(() => {
    if (summary && summary.awaitingReview === 0 && filter === 'IN_REVIEW') setFilter('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = (list || []).filter((c) => !q || c.title.toLowerCase().includes(q) || (c.advertiser?.name || '').toLowerCase().includes(q));
    // Waiting for review first, oldest submission first
    return rows.sort((a, b) => {
      const ra = a.status === 'IN_REVIEW' ? 0 : 1;
      const rb = b.status === 'IN_REVIEW' ? 0 : 1;
      if (ra !== rb) return ra - rb;
      if (ra === 0) return new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0);
      return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
    });
  }, [list, search]);

  const l30 = summary?.last30;

  return (
    <div className="space-y-6">
      {summary === null ? (
        <Loading>Loading advertising summary…</Loading>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Live now" value={num(summary.live)} hint={`${num(summary.byStatus?.APPROVED || 0)} approved in total`} />
            <Stat label="Awaiting review" value={num(summary.awaitingReview)} tone={summary.awaitingReview ? 'text-brand' : 'text-ink'} onClick={() => setFilter('IN_REVIEW')} hint="Open the queue" />
            <Stat label="Impressions (30 days)" value={num(l30?.impressions)} hint={`${pct(l30?.viewableRate)} viewable`} />
            <Stat label="Clicks (30 days)" value={num(l30?.clicks)} hint={`CTR ${pct(l30?.ctr)}`} />
            <Stat label="Booked value" value={nprAd(summary.money?.booked)} hint="Approved, paused and ended" />
            <Stat label="Earned to date" value={nprAd(summary.money?.earned)} hint="Delivered so far" />
            <Stat label="Filtered (30 days)" value={num(l30?.filtered)} hint="Staff, bots, repeats — not billed" />
            <Stat label="Drafts · rejected" value={`${num(summary.byStatus?.DRAFT || 0)} · ${num(summary.byStatus?.REJECTED || 0)}`} hint={`${num(summary.byStatus?.PAUSED || 0)} paused · ${num(summary.byStatus?.ENDED || 0)} ended`} />
          </div>
          {summary.money?.note && <p className="text-xs text-muted">{summary.money.note}</p>}
          {summary.top?.length > 0 && (
            <Panel title="Top campaigns by impressions">
              <ul className="divide-y divide-sand">
                {summary.top.map((t) => (
                  <li key={t._id}>
                    <button type="button" onClick={() => setOpenId(t._id)} className="flex w-full flex-wrap items-center justify-between gap-2 px-5 py-3 text-left hover:bg-paper">
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{t.title}</span>
                        <span className="block text-xs text-muted">{t.advertiser}</span>
                      </span>
                      <span className="flex items-center gap-3 text-sm tabular-nums text-ink-soft">
                        <AdChip value={t.deliveryStatus} />
                        {num(t.impressions)} impr. · {num(t.clicks)} clicks · {pct(t.ctr)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      ) : (
        <p className="card p-5 text-sm text-muted">The advertising summary could not be loaded.</p>
      )}

      <Panel
        title="Ad campaigns"
        count={list ? shown.length : undefined}
        description="Ads from verified sponsor accounts. Every ad is reviewed before it runs."
        actions={
          <div className="w-full sm:w-56">
            <label htmlFor="ads-filter" className="sr-only">Status</label>
            <select id="ads-filter" className="field" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {FILTERS.map((f) => <option key={f.id || 'all'} value={f.id}>{f.label}</option>)}
            </select>
          </div>
        }
      >
        {list === null ? (
          <Loading>Loading campaigns…</Loading>
        ) : shown.length === 0 ? (
          <Empty icon={Megaphone}>
            {search ? 'No campaigns match your search.' : filter === 'IN_REVIEW' ? 'Nothing is waiting for review.' : 'No ad campaigns with this status yet.'}
          </Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Campaign</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold text-right">Impr.</th>
                  <th className="px-4 py-3 font-semibold text-right">CTR</th>
                  <th className="px-4 py-3 font-semibold text-right">Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {shown.map((c) => (
                  <tr key={c._id} className="hover:bg-paper">
                    <td className="max-w-[18rem] px-4 py-3">
                      <button type="button" onClick={() => setOpenId(c._id)} className="text-left font-semibold text-ink hover:text-brand hover:underline">{c.title}</button>
                      <span className="block text-xs text-muted">
                        {c.advertiser?.name}
                        {c.advertiser?.verificationStatus !== 'VERIFIED' && ' · account not verified'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <AdChip value={c.deliveryStatus} />
                      {c.status === 'IN_REVIEW' && c.submittedAt && <span className="block pt-1 text-xs text-muted">since {fmtDate(c.submittedAt)}</span>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{dateRange(c.startDate, c.endDate)}</td>
                    <td className="max-w-[14rem] px-4 py-3 text-ink-soft">{priceLine(c)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{num(c.totals?.impressions)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{pct(c.ctr)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{nprAd(c.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {openId && (
        <AdCampaignDrawer
          campaignId={openId}
          onClose={() => {
            setOpenId(null);
            load();
            loadSummary();
          }}
          onChanged={(d) => setList((rows) => (rows || []).map((x) => (x._id === d._id ? { ...x, ...d } : x)))}
        />
      )}
    </div>
  );
};

export default AdsTab;
