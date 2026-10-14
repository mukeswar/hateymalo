import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, LayoutGrid, List, Handshake, BadgeCheck, ImageOff, CheckSquare } from 'lucide-react';
import API from '../../../services/api';
import { useToast } from '../../../context/ToastContext';
import DealDrawer from './DealDrawer';
import {
  SP, STAGES, OPEN_STAGES, CLOSED_STAGES, label, npr, hasValue, fmtDate, errMsg, idOf, downloadCsv,
  Chip, Panel, Loading, Empty, BTN_GHOST,
} from './shared';

const COLUMNS = [...OPEN_STAGES, 'AGREED', 'FULFILLED', 'CLOSED'];
const columnOf = (stage) => (CLOSED_STAGES.includes(stage) ? 'CLOSED' : stage);
const STAGE_FILTERS = [
  { id: '', label: 'All stages' },
  { id: 'ACTIVE', label: 'Active (not closed)' },
  ...STAGES.map((s) => ({ id: s, label: label(s) })),
];

const moneyLine = (d) => {
  if (hasValue(d.cashAmount) && d.cashAmount > 0) {
    return `${npr(d.cashAmount)} contracted${hasValue(d.amountReceived) ? ` · ${npr(d.amountReceived)} received` : ''}`;
  }
  if (hasValue(d.proposal?.amount) && d.proposal.amount > 0) return `${npr(d.proposal.amount)} proposed`;
  return '';
};

const DealCard = ({ d, showOpportunity, onOpen }) => {
  const dl = d.deliverables || [];
  const done = dl.filter((x) => ['DONE', 'WAIVED'].includes(x.status)).length;
  const money = moneyLine(d);
  const inKind = (d.inKindItems || []).filter((i) => i.status !== 'CANCELLED').length;
  return (
    <button type="button" onClick={() => onOpen(d._id)} className="card-hover block w-full rounded-2xl border border-sand bg-white p-3.5 text-left">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 font-semibold leading-tight text-ink">{d.sponsor?.name || 'Sponsor'}</p>
        {d.sponsor?.verificationStatus === 'VERIFIED' ? (
          <BadgeCheck className="h-4 w-4 shrink-0 text-pine" aria-label="Verified sponsor" />
        ) : (
          <Chip status={d.sponsor?.verificationStatus} className="!px-2 !text-[11px]" />
        )}
      </div>
      {showOpportunity && <p className="mt-0.5 truncate text-xs text-muted">{d.opportunity?.title}</p>}
      <p className="mt-1.5 text-sm text-ink-soft">{d.tier?.name || (d.isCustomQuote ? 'Custom proposal' : 'No package')}</p>
      {money && <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">{money}</p>}
      {inKind > 0 && <p className="text-xs text-sky-ink">{inKind} in-kind item{inKind > 1 ? 's' : ''}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        {dl.length > 0 && (
          <span className="inline-flex items-center gap-1"><CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />{done}/{dl.length}</span>
        )}
        {!d.logoUsageApproved && (
          <span className="inline-flex items-center gap-1 text-marigold-text"><ImageOff className="h-3.5 w-3.5" aria-hidden="true" />logo not approved</span>
        )}
        <span>Updated {fmtDate(d.updatedAt)}</span>
      </div>
    </button>
  );
};

/**
 * Sponsor deal pipeline. `opportunityId` locks the list to one campaign
 * (organiser workspace). `focus` = { deal, opportunity, sponsor, nonce } comes
 * from deep links and other tabs.
 */
const DealsTab = ({ opportunityId = null, focus = null, onFocusHandled, search = '', refreshKey = 0 }) => {
  const { showToast } = useToast();
  const [deals, setDeals] = useState(null);
  const [opps, setOpps] = useState([]);
  const [filters, setFilters] = useState({ opportunity: opportunityId || '', stage: '', sponsor: '' });
  const [view, setView] = useState(() => {
    try {
      return localStorage.getItem('hm_deals_view') || 'board';
    } catch {
      return 'board';
    }
  });
  const [openId, setOpenId] = useState(null);

  // Deep link / cross-tab focus
  useEffect(() => {
    if (!focus) return;
    setFilters((f) => ({
      opportunity: opportunityId || focus.opportunity || (focus.deal ? '' : f.opportunity),
      stage: focus.deal ? '' : f.stage,
      sponsor: focus.sponsor || (focus.deal ? '' : f.sponsor),
    }));
    if (focus.deal) setOpenId(focus.deal);
    onFocusHandled?.(); // so returning to this tab later does not reopen it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus?.nonce]);

  useEffect(() => {
    if (opportunityId) return;
    API.get(`${SP}/admin/opportunities`).then((r) => setOpps(r.data.data || [])).catch(() => {});
  }, [opportunityId, refreshKey]);

  const load = useCallback(async () => {
    const params = {};
    if (filters.opportunity) params.opportunity = filters.opportunity;
    if (filters.sponsor) params.sponsor = filters.sponsor;
    if (filters.stage === 'ACTIVE') params.stage = [...OPEN_STAGES, 'AGREED'].join(',');
    else if (filters.stage) params.stage = filters.stage;
    try {
      const res = await API.get(`${SP}/admin/deals`, { params });
      setDeals(res.data.data || []);
    } catch (e) {
      setDeals([]);
      showToast(errMsg(e, 'Could not load deals'), 'error');
    }
    // showToast changes identity on every toast; leaving it out avoids reload loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const setView2 = (v) => {
    setView(v);
    try {
      localStorage.setItem('hm_deals_view', v);
    } catch {
      /* ignore */
    }
  };

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (deals || []).filter((d) => !q || (d.sponsor?.name || '').toLowerCase().includes(q) || (d.opportunity?.title || '').toLowerCase().includes(q));
  }, [deals, search]);

  // Sponsor filter options come from the deals themselves (works for every staff role)
  const [sponsorOptions, setSponsorOptions] = useState([]);
  useEffect(() => {
    if (!deals) return;
    setSponsorOptions((prev) => {
      const map = new Map(prev.map((s) => [s._id, s.name]));
      deals.forEach((d) => d.sponsor?._id && map.set(d.sponsor._id, d.sponsor.name));
      return [...map].map(([_id, name]) => ({ _id, name })).sort((a, b) => a.name.localeCompare(b.name));
    });
  }, [deals]);

  const exportCsv = () => {
    const anyCash = shown.some((d) => hasValue(d.cashAmount));
    const anyReceived = shown.some((d) => hasValue(d.amountReceived));
    const anyInKindValue = shown.some((d) => hasValue(d.inKindEstimatedValue));
    const rows = shown.map((d) => {
      const dl = d.deliverables || [];
      return {
        Sponsor: d.sponsor?.name || '',
        'Sponsor verification': d.sponsor?.verificationStatus || '',
        Campaign: d.opportunity?.title || '',
        Stage: d.stage,
        Package: d.tier?.name || '',
        'Custom quote': d.isCustomQuote ? 'yes' : 'no',
        ...(anyCash ? { 'Proposed cash (NPR)': d.proposal?.amount ?? '', 'Contracted cash (NPR)': d.cashAmount ?? '' } : {}),
        ...(anyReceived ? { 'Received (NPR)': d.amountReceived ?? '' } : {}),
        ...(anyInKindValue ? { 'In-kind estimated value (NPR, not cash)': d.inKindEstimatedValue ?? '' } : {}),
        'In-kind items': (d.inKindItems || []).filter((i) => i.status !== 'CANCELLED').length,
        'Deliverables done': `${dl.filter((x) => ['DONE', 'WAIVED'].includes(x.status)).length}/${dl.length}`,
        'Logo approved': d.logoUsageApproved ? 'yes' : 'no',
        'Signed on': d.agreement?.signedAt ? new Date(d.agreement.signedAt).toISOString().slice(0, 10) : '',
        Created: d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : '',
        Updated: d.updatedAt ? new Date(d.updatedAt).toISOString().slice(0, 10) : '',
      };
    });
    if (!downloadCsv(rows, `hateymalo_sponsor_deals_${new Date().toISOString().slice(0, 10)}`)) showToast('No deals to export', 'info');
  };

  const onChanged = (d) => {
    setDeals((list) => (list || []).map((x) => (x._id === d._id ? { ...x, ...d, messages: undefined, history: undefined } : x)));
  };

  const closeDrawer = () => {
    setOpenId(null);
    load();
  };

  const showOpp = !opportunityId && !filters.opportunity;
  const byColumn = Object.fromEntries(COLUMNS.map((c) => [c, shown.filter((d) => columnOf(d.stage) === c)]));
  const fid = opportunityId ? `ws-${opportunityId}` : 'deals';

  return (
    <Panel
      title="Sponsor deals"
      count={deals ? shown.length : undefined}
      description="Every proposal from first contact to fulfilment. Open a deal to review, agree terms and track delivery."
      actions={
        <>
          <div className="flex rounded-full border border-sand bg-white p-1" role="group" aria-label="Layout">
            <button type="button" onClick={() => setView2('board')} aria-pressed={view === 'board'} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${view === 'board' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'}`}>
              <LayoutGrid className="h-4 w-4" aria-hidden="true" /> Board
            </button>
            <button type="button" onClick={() => setView2('list')} aria-pressed={view === 'list'} className={`inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-sm font-semibold ${view === 'list' ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper'}`}>
              <List className="h-4 w-4" aria-hidden="true" /> List
            </button>
          </div>
          <button type="button" onClick={exportCsv} className={BTN_GHOST}>
            <Download className="h-4 w-4" aria-hidden="true" /> CSV
          </button>
        </>
      }
    >
      <div className="grid gap-3 border-b border-sand p-4 sm:grid-cols-3 sm:p-5">
        {!opportunityId && (
          <div>
            <label htmlFor={`${fid}-opp`} className="field-label">Campaign</label>
            <select id={`${fid}-opp`} value={filters.opportunity} onChange={(e) => setFilters({ ...filters, opportunity: e.target.value })} className="field">
              <option value="">All campaigns</option>
              {opps.map((o) => <option key={o._id} value={o._id}>{o.title}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor={`${fid}-stage`} className="field-label">Stage</label>
          <select id={`${fid}-stage`} value={filters.stage} onChange={(e) => setFilters({ ...filters, stage: e.target.value })} className="field">
            {STAGE_FILTERS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={`${fid}-sponsor`} className="field-label">Sponsor</label>
          <select id={`${fid}-sponsor`} value={filters.sponsor} onChange={(e) => setFilters({ ...filters, sponsor: e.target.value })} className="field">
            <option value="">All sponsors</option>
            {filters.sponsor && !sponsorOptions.some((s) => s._id === filters.sponsor) && <option value={filters.sponsor}>Selected sponsor</option>}
            {sponsorOptions.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {deals === null ? (
        <Loading>Loading deals…</Loading>
      ) : shown.length === 0 ? (
        <Empty icon={Handshake}>{search ? 'No deals match your search.' : 'No sponsor deals match these filters yet.'}</Empty>
      ) : view === 'board' ? (
        <div className="overflow-x-auto p-4 sm:p-5">
          <div className="flex min-w-max gap-3">
            {COLUMNS.map((c) => (
              <section key={c} aria-label={c === 'CLOSED' ? 'Closed deals' : label(c)} className="flex w-64 shrink-0 flex-col rounded-2xl bg-paper-deep/60 p-2.5">
                <h3 className="mb-2 flex items-center justify-between px-1 text-sm font-bold text-ink">
                  {c === 'CLOSED' ? 'Declined / withdrawn / cancelled' : label(c)}
                  <span className="rounded-full bg-white px-2 text-xs tabular-nums text-muted">{byColumn[c].length}</span>
                </h3>
                <div className="space-y-2">
                  {byColumn[c].length === 0 ? (
                    <p className="rounded-xl border border-dashed border-sand px-2 py-4 text-center text-xs text-muted">None</p>
                  ) : (
                    byColumn[c].map((d) => <DealCard key={d._id} d={d} showOpportunity={showOpp} onOpen={setOpenId} />)
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper/70 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Sponsor</th>
                {showOpp && <th className="px-4 py-3 font-semibold">Campaign</th>}
                <th className="px-4 py-3 font-semibold">Stage</th>
                <th className="px-4 py-3 font-semibold">Package</th>
                <th className="px-4 py-3 font-semibold">Amounts</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {shown.map((d) => (
                <tr key={d._id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => setOpenId(d._id)} className="text-left font-semibold text-ink hover:text-brand hover:underline">{d.sponsor?.name}</button>
                    {d.sponsor?.verificationStatus !== 'VERIFIED' && <Chip status={d.sponsor?.verificationStatus} className="ml-2" />}
                  </td>
                  {showOpp && <td className="max-w-[16rem] px-4 py-3 text-ink-soft">{d.opportunity?.title}</td>}
                  <td className="px-4 py-3"><Chip status={d.stage} /></td>
                  <td className="px-4 py-3 text-ink-soft">{d.tier?.name || (d.isCustomQuote ? 'Custom' : '—')}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-soft">{moneyLine(d) || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{fmtDate(d.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openId && <DealDrawer dealId={idOf(openId)} onClose={closeDrawer} onChanged={onChanged} />}
    </Panel>
  );
};

export default DealsTab;
