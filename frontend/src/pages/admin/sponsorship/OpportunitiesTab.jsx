import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Handshake, Layers, ExternalLink, Megaphone, MapPin, CalendarDays, ImageOff, Users } from 'lucide-react';
import API from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import OpportunityForm from './OpportunityForm';
import TierEditor from './TierEditor';
import BrandKitEditor from './BrandKitEditor';
import {
  SP, OPP_STATUSES, STAGES, label, npr, hasValue, dateRange, errMsg,
  Chip, Panel, Modal, SubTabs, Stat, Loading, Empty, BTN_PRIMARY, BTN_GHOST, BTN_DANGER,
} from './shared';

const Summary = ({ refreshKey, onViewSponsors }) => {
  const [s, setS] = useState(null);
  useEffect(() => {
    API.get(`${SP}/admin/summary`).then((r) => setS(r.data.data)).catch(() => setS(false));
  }, [refreshKey]);
  if (s === null) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-[104px] animate-pulse rounded-[var(--radius-card)] bg-paper-deep" />)}
      </div>
    );
  }
  if (!s) return null;
  const inKindTotal = (s.inKind?.pledgedValue || 0) + (s.inKind?.receivedValue || 0);
  const stageCount = Object.fromEntries((s.pipeline || []).map((p) => [p.stage, p.deals]));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Contracted cash" value={npr(s.contractedCash)} hint="Agreed & fulfilled deals" />
        {hasValue(s.receivedCash) && <Stat label="Received" value={npr(s.receivedCash)} hint="Payments recorded by finance" tone="text-pine" />}
        {hasValue(s.outstandingCash) && <Stat label="Outstanding" value={npr(s.outstandingCash)} hint="Contracted, not yet received" tone="text-brand" />}
        <Stat
          label="In-kind (estimated — not cash)"
          value={npr(inKindTotal)}
          hint={`${npr(s.inKind?.receivedValue || 0)} received · ${s.inKind?.items || 0} item${s.inKind?.items === 1 ? '' : 's'}`}
          tone="text-sky-ink"
        />
        <Stat
          label="Sponsors awaiting verification"
          value={s.pendingSponsorAccounts}
          hint={s.pendingSponsorAccounts ? 'Review now →' : 'All caught up'}
          tone={s.pendingSponsorAccounts ? 'text-marigold-text' : 'text-ink'}
          onClick={onViewSponsors}
        />
      </div>
      <div className="card flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
        <span className="font-semibold text-ink">Pipeline</span>
        {STAGES.filter((st) => stageCount[st]).length === 0 ? (
          <span className="text-muted">No deals yet</span>
        ) : (
          STAGES.filter((st) => stageCount[st]).map((st) => (
            <span key={st} className="inline-flex items-center gap-1.5"><Chip status={st} /> <span className="font-semibold tabular-nums">{stageCount[st]}</span></span>
          ))
        )}
        <span className="ml-auto text-xs text-muted">{s.inKind?.note}</span>
      </div>
    </div>
  );
};

const OpportunityEditor = ({ opportunity, onClose, onSaved, onCreated }) => {
  const { showToast } = useToast();
  const isNew = !opportunity?._id;
  const [tab, setTab] = useState('details');
  const [templates, setTemplates] = useState([]);
  const [wasNew] = useState(isNew);
  useEffect(() => {
    if (wasNew && !isNew) setTab('tiers'); // just created: go on to packages
  }, [wasNew, isNew]);
  useEffect(() => {
    if (!isNew) return;
    API.get(`${SP}/tiers`, { params: { opportunity: 'templates' } }).then((r) => setTemplates(r.data.data || [])).catch(() => {});
  }, [isNew]);

  const submit = async (body) => {
    try {
      if (isNew) {
        const res = await API.post(`${SP}/opportunities`, body);
        showToast(res.data.message || 'Opportunity created', 'success');
        onCreated(res.data.data);
      } else {
        const res = await API.put(`${SP}/opportunities/${opportunity._id}`, body);
        showToast(res.data.message || 'Opportunity updated', 'success');
        onSaved(res.data.data);
      }
    } catch (e) {
      showToast(errMsg(e, 'Could not save the opportunity'), 'error');
    }
  };

  return (
    <Modal title={isNew ? 'New sponsorship opportunity' : opportunity.title} icon={Megaphone} size="max-w-4xl" onClose={onClose}>
      {!isNew && (
        <div className="mb-5">
          <SubTabs
            ariaLabel="Opportunity sections"
            value={tab}
            onChange={setTab}
            tabs={[{ id: 'details', label: 'Details' }, { id: 'tiers', label: 'Packages' }, { id: 'brand', label: 'Brand kit' }]}
          />
        </div>
      )}
      {tab === 'details' && (
        <OpportunityForm
          key={opportunity?._id || 'new'}
          opportunity={opportunity}
          isManager
          templates={templates}
          onSubmit={submit}
          onCancel={onClose}
          submitLabel={isNew ? 'Create opportunity' : 'Save changes'}
        />
      )}
      {tab === 'tiers' && !isNew && <TierEditor opportunityId={opportunity._id} />}
      {tab === 'brand' && !isNew && <BrandKitEditor opportunityId={opportunity._id} opportunity={opportunity} canEdit />}
    </Modal>
  );
};

/** Opportunities & tiers (sponsorship managers). */
const OpportunitiesTab = ({ search = '', refreshKey = 0, onViewDeals, onViewSponsors }) => {
  const { can } = useAuth();
  const { showToast } = useToast();
  const [status, setStatus] = useState('');
  const [list, setList] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | opportunity
  const [showTemplates, setShowTemplates] = useState(false);
  const [bump, setBump] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await API.get(`${SP}/admin/opportunities`, { params: status ? { status } : {} });
      setList(res.data.data || []);
      return res.data.data || [];
    } catch (e) {
      setList([]);
      showToast(errMsg(e, 'Could not load opportunities'), 'error');
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    load();
  }, [load, refreshKey, bump]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list || []).filter((o) => !q || [o.title, o.location, o.summary].some((x) => (x || '').toLowerCase().includes(q)));
  }, [list, search]);

  const remove = async (o) => {
    if (!window.confirm(`Delete "${o.title}"? Its packages and any declined or withdrawn proposals are deleted too. This cannot be undone.`)) return;
    try {
      const res = await API.delete(`${SP}/opportunities/${o._id}`);
      showToast(res.data.message || 'Opportunity deleted', 'success');
      setBump((b) => b + 1);
    } catch (e) {
      showToast(errMsg(e, 'Could not delete'), 'error');
    }
  };

  if (!can('canManageSponsorships')) return <Empty>Only sponsorship managers can manage opportunities.</Empty>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <p className="eyebrow">Sponsorship</p>
        <h1 className="text-3xl font-bold text-ink">Opportunities & packages</h1>
        <p className="text-muted">Campaigns open to sponsors, their packages, and the money and in-kind support agreed so far.</p>
      </div>

      <Summary refreshKey={refreshKey + bump} onViewSponsors={onViewSponsors} />

      <Panel
        title="Opportunities"
        count={list ? shown.length : undefined}
        actions={
          <>
            <label htmlFor="sp-opp-status" className="sr-only">Status</label>
            <select id="sp-opp-status" value={status} onChange={(e) => setStatus(e.target.value)} className="field !w-auto !py-2">
              <option value="">All statuses</option>
              {OPP_STATUSES.map((s) => <option key={s} value={s}>{label(s)}</option>)}
            </select>
            <button type="button" onClick={() => setShowTemplates(true)} className={BTN_GHOST}><Layers className="h-4 w-4" aria-hidden="true" /> Package templates</button>
            <button type="button" onClick={() => setEditing('new')} className={BTN_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> New opportunity</button>
          </>
        }
      >
        {list === null ? (
          <Loading />
        ) : shown.length === 0 ? (
          <Empty icon={Megaphone} action={!search && <button type="button" onClick={() => setEditing('new')} className={BTN_PRIMARY}><Plus className="h-4 w-4" aria-hidden="true" /> Create the first opportunity</button>}>
            {search ? 'No opportunities match your search.' : status ? `No ${label(status).toLowerCase()} opportunities.` : 'No sponsorship opportunities yet.'}
          </Empty>
        ) : (
          <ul className="divide-y divide-sand">
            {shown.map((o) => {
              const st = o.dealStats || {};
              const pct = o.fundingGoal > 0 && hasValue(st.contractedCash) ? Math.min(100, Math.round((st.contractedCash / o.fundingGoal) * 100)) : null;
              return (
                <li key={o._id} className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 flex-1 gap-4">
                    {o.coverImage ? (
                      <img src={o.coverImage} alt="" className="hidden h-20 w-28 shrink-0 rounded-xl object-cover sm:block" />
                    ) : (
                      <span className="hidden h-20 w-28 shrink-0 items-center justify-center rounded-xl bg-paper-deep text-muted sm:inline-flex"><ImageOff className="h-5 w-5" aria-hidden="true" /></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button type="button" onClick={() => setEditing(o)} className="text-left text-lg font-bold leading-tight text-ink hover:text-brand">{o.title}</button>
                        <Chip status={o.status} />
                        <span className="chip bg-paper-deep text-ink-soft">{label(o.campaignType)}</span>
                      </div>
                      <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
                        {o.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{o.location}</span>}
                        {(o.startDate || o.endDate) && <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{dateRange(o.startDate, o.endDate)}</span>}
                        {o.organizers?.length > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" aria-hidden="true" />{o.organizers.map((u) => u.name).join(', ')}</span>}
                      </p>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        <span className="font-semibold tabular-nums">{st.total || 0}</span> deal{st.total === 1 ? '' : 's'} · {st.open || 0} open · {st.contracted || 0} agreed
                        {hasValue(st.contractedCash) && <> · <span className="font-semibold tabular-nums">{npr(st.contractedCash)}</span> contracted</>}
                        {hasValue(st.received) && <> · {npr(st.received)} received</>}
                      </p>
                      {pct !== null && (
                        <div className="mt-2 max-w-sm">
                          <div className="progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Funding goal secured"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
                          <p className="mt-0.5 text-xs text-muted">{pct}% of {npr(o.fundingGoal)} goal contracted</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button type="button" onClick={() => setEditing(o)} className={BTN_GHOST}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>
                    <button type="button" onClick={() => onViewDeals?.(o._id)} className={BTN_GHOST}><Handshake className="h-3.5 w-3.5" aria-hidden="true" /> Deals</button>
                    <Link to={`/organize/${o._id}`} className={BTN_GHOST}>Workspace</Link>
                    {['OPEN', 'CLOSED', 'COMPLETED'].includes(o.status) && (
                      <a href={`/sponsor/opportunities/${o._id}`} target="_blank" rel="noopener noreferrer" className={BTN_GHOST} aria-label={`Public page for ${o.title} (opens in a new tab)`}>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Public
                      </a>
                    )}
                    <button type="button" onClick={() => remove(o)} className={BTN_DANGER} aria-label={`Delete ${o.title}`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {editing && (
        <OpportunityEditor
          opportunity={editing === 'new' ? null : editing}
          onClose={() => {
            setEditing(null);
            setBump((b) => b + 1);
          }}
          onSaved={async (o) => {
            // Re-read so organisers come back populated
            const fresh = await load();
            setEditing((prev) => (prev && prev !== 'new' ? fresh.find((x) => x._id === o._id) || { ...prev, ...o, organizers: prev.organizers } : prev));
          }}
          onCreated={async (o) => {
            const fresh = await load();
            setEditing(fresh.find((x) => x._id === o._id) || o); // continue with packages and brand kit
          }}
        />
      )}
      {showTemplates && (
        <Modal title="Package template library" icon={Layers} size="max-w-3xl" onClose={() => setShowTemplates(false)}>
          <TierEditor opportunityId={null} />
        </Modal>
      )}
    </div>
  );
};

export default OpportunitiesTab;
