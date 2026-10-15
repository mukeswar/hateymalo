import React, { useCallback, useEffect, useState } from 'react';
import { Download, Info, ShieldAlert } from 'lucide-react';
import API from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { FORMAT_LABELS, SURFACE_LABELS, downloadReportCsv, num, nprAd, pct } from './adShared';

const errMsg = (e, f) => e?.response?.data?.message || f;

const Tile = ({ label, value, hint }) => (
  <div className="card p-4">
    <p className="text-sm font-medium text-muted">{label}</p>
    <p className="mt-1.5 font-display text-2xl font-bold leading-none tabular-nums text-ink">{value}</p>
    {hint && <p className="mt-1.5 text-xs font-semibold text-muted">{hint}</p>}
  </div>
);

const TH = 'px-3 py-2.5 font-semibold whitespace-nowrap';
const TD = 'px-3 py-2.5 whitespace-nowrap tabular-nums';

const Table = ({ head, children, caption }) => (
  <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
    <table className="w-full min-w-[560px] text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
        <tr>{head.map((h) => <th key={h} scope="col" className={TH}>{h}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-sand">{children}</tbody>
    </table>
  </div>
);

// Single-series daily bar chart (impressions), with a per-bar tooltip.
// The table below carries the same numbers for screen readers.
const DailyBars = ({ days }) => {
  const [hover, setHover] = useState(null);
  if (!days.length) return null;
  const max = Math.max(1, ...days.map((d) => d.impressions));
  const shown = days.slice(-60);
  return (
    <figure className="card p-4 sm:p-5">
      <figcaption className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold text-ink">Impressions per day</span>
        <span className="text-xs text-muted" aria-live="polite">
          {hover !== null
            ? `${shown[hover].day}: ${num(shown[hover].impressions)} impressions · ${num(shown[hover].viewable)} viewable · ${num(shown[hover].clicks)} clicks`
            : `Peak ${num(max)} · hover or tap a bar`}
        </span>
      </figcaption>
      <div className="flex h-40 items-end gap-[2px] border-b border-sand" aria-hidden="true" onMouseLeave={() => setHover(null)}>
        {shown.map((d, i) => (
          <button
            key={d.day}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setHover(i)}
            onClick={() => setHover(i)}
            className="group flex h-full min-w-[4px] flex-1 items-end"
          >
            <span
              className={`block w-full rounded-t-[4px] ${hover === i ? 'bg-pine-dark' : 'bg-pine'}`}
              style={{ height: `${Math.max(d.impressions ? 2 : 0, (d.impressions / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted tabular-nums" aria-hidden="true">
        <span>{shown[0].day}</span>
        {shown.length > 1 && <span>{shown[shown.length - 1].day}</span>}
      </div>
    </figure>
  );
};

/**
 * Campaign performance report: GET /ads/campaigns/:id/report.
 * Valid traffic and filtered traffic are shown separately; filtered is never billed.
 */
const AdReport = ({ campaignId, title = 'campaign' }) => {
  const { showToast } = useToast();
  const [range, setRange] = useState({ from: '', to: '' });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const params = Object.fromEntries(Object.entries(range).filter(([, v]) => v));

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await API.get(`/ads/campaigns/${campaignId}/report`, { params });
      setData(res.data.data);
    } catch (e) {
      setError(errMsg(e, 'Could not load the report'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const csv = async () => {
    setDownloading(true);
    try {
      await downloadReportCsv(API, campaignId, params, `hateymalo-ad-${title}`);
    } catch (e) {
      showToast(errMsg(e, 'Could not download the CSV'), 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (error) return <p className="card p-6 text-center text-sm text-brand">{error}</p>;
  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Loading report">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((n) => <div key={n} className="h-24 animate-pulse rounded-[var(--radius-card)] bg-paper-deep" />)}</div>
        <div className="h-48 animate-pulse rounded-[var(--radius-card)] bg-paper-deep" />
      </div>
    );
  }

  const t = data.totals || {};
  const c = data.campaign || {};
  const hasVideo = (t.videoStarts || 0) > 0;
  const nothing = !t.served && !t.impressions && !t.filteredImpressions;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={`rep-from-${campaignId}`} className="field-label">From</label>
            <input id={`rep-from-${campaignId}`} type="date" className="field" value={range.from || data.range?.from || ''} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
          </div>
          <div>
            <label htmlFor={`rep-to-${campaignId}`} className="field-label">To</label>
            <input id={`rep-to-${campaignId}`} type="date" className="field" value={range.to || data.range?.to || ''} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
          </div>
        </div>
        <button type="button" onClick={csv} disabled={downloading} className="btn btn-ghost btn-sm min-h-10 self-start sm:self-auto">
          <Download className="h-4 w-4" aria-hidden="true" /> {downloading ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Impressions" value={num(t.impressions)} hint={`${num(t.served)} served to pages`} />
        <Tile label="Viewable" value={num(t.viewable)} hint={`${pct(t.viewableRate)} of impressions`} />
        <Tile label="Clicks" value={num(t.clicks)} hint={`CTR ${pct(t.ctr)}`} />
        <Tile
          label="Spend to date"
          value={nprAd(t.spend)}
          hint={c.pricingModel === 'FLAT' ? 'Flat price (whole campaign)' : c.budget ? `of ${nprAd(c.budget)} budget` : ''}
        />
      </div>

      {hasVideo && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Tile label="Video starts" value={num(t.videoStarts)} />
          <Tile label="25% watched" value={num(t.videoQ25)} />
          <Tile label="50% watched" value={num(t.videoQ50)} />
          <Tile label="75% watched" value={num(t.videoQ75)} />
          <Tile label="Completed" value={num(t.videoComplete)} hint={`${pct(t.completionRate)} of starts`} />
          <Tile label="Skipped" value={num(t.videoSkips)} />
        </div>
      )}

      <div className="surface-sunken flex gap-3 p-4 text-sm text-ink-soft">
        <ShieldAlert className="h-5 w-5 shrink-0 text-sky-ink" aria-hidden="true" />
        <p>
          <strong className="text-ink">Filtered traffic (not billed):</strong> {num(t.filteredImpressions)} impressions and {num(t.filteredClicks)} clicks from staff views, bots,
          repeats or expired links. These are not included in the numbers above.
        </p>
      </div>

      {nothing ? (
        <div className="card p-8 text-center text-sm text-muted">No traffic in this date range yet. Numbers appear here as soon as the ad is shown.</div>
      ) : (
        <>
          <DailyBars days={data.days || []} />

          <section aria-labelledby={`rep-days-${campaignId}`} className="space-y-2">
            <h3 id={`rep-days-${campaignId}`} className="font-semibold text-ink">By day</h3>
            <Table head={['Day', 'Served', 'Impressions', 'Viewable', 'Clicks', 'CTR', 'Filtered', 'Spend']} caption="Daily performance">
              {(data.days || []).slice().reverse().map((d) => (
                <tr key={d.day}>
                  <td className={TD}>{d.day}</td>
                  <td className={TD}>{num(d.served)}</td>
                  <td className={TD}>{num(d.impressions)}</td>
                  <td className={TD}>{num(d.viewable)}</td>
                  <td className={TD}>{num(d.clicks)}</td>
                  <td className={TD}>{pct(d.ctr)}</td>
                  <td className={`${TD} text-muted`}>{num((d.filteredImpressions || 0) + (d.filteredClicks || 0))}</td>
                  <td className={TD}>{d.spend === null || d.spend === undefined ? '—' : nprAd(d.spend)}</td>
                </tr>
              ))}
            </Table>
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <section aria-labelledby={`rep-cr-${campaignId}`} className="space-y-2 min-w-0">
              <h3 id={`rep-cr-${campaignId}`} className="font-semibold text-ink">By creative</h3>
              <Table head={['Creative', 'Impressions', 'Viewable', 'Clicks', 'CTR']} caption="Performance by creative">
                {(data.byCreative || []).map((r) => {
                  const k = (c.creatives || []).find((x) => String(x._id) === String(r.creative));
                  return (
                    <tr key={r.creative}>
                      <td className="px-3 py-2.5 min-w-[10rem]">
                        <span className="font-semibold text-ink">{r.name}</span>
                        {k && <span className="block text-xs text-muted">{FORMAT_LABELS[k.format]}</span>}
                      </td>
                      <td className={TD}>{num(r.impressions)}</td>
                      <td className={TD}>{num(r.viewable)}</td>
                      <td className={TD}>{num(r.clicks)}</td>
                      <td className={TD}>{pct(r.ctr)}</td>
                    </tr>
                  );
                })}
              </Table>
            </section>
            <section aria-labelledby={`rep-pl-${campaignId}`} className="space-y-2 min-w-0">
              <h3 id={`rep-pl-${campaignId}`} className="font-semibold text-ink">By placement</h3>
              <Table head={['Placement', 'Where', 'Impressions', 'Clicks', 'CTR']} caption="Performance by placement">
                {(data.byPlacement || []).map((r) => (
                  <tr key={`${r.placement}-${r.surface}`}>
                    <td className={`${TD} font-mono text-xs`}>{r.placement}</td>
                    <td className={TD}>{SURFACE_LABELS[r.surface] || r.surface}</td>
                    <td className={TD}>{num(r.impressions)}</td>
                    <td className={TD}>{num(r.clicks)}</td>
                    <td className={TD}>{pct(r.ctr)}</td>
                  </tr>
                ))}
              </Table>
            </section>
          </div>
        </>
      )}

      {(data.notes || []).length > 0 && (
        <ul className="space-y-1.5 text-xs text-muted">
          {data.notes.map((n) => (
            <li key={n} className="flex gap-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AdReport;
