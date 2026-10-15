import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Reveal } from '../../components/ui/motion';
import AccountForm from '../../components/sponsorship/AccountForm';
import {
  ACCOUNT_TYPES,
  CAMPAIGN_TYPES,
  Chip,
  LogoTile,
  Modal,
  STAGES,
  VERIFICATION,
  dateRange,
  errMsg,
} from '../../components/sponsorship/shared';
import { ArrowRight, Briefcase, Building2, ChevronRight, FileText, Megaphone, Plus, ReceiptText, Search, Users } from 'lucide-react';

const GROUPS = [
  { key: 'action', title: 'In progress', stages: ['APPLIED', 'IN_REVIEW', 'NEGOTIATING'], empty: 'No proposals waiting on a decision.' },
  { key: 'active', title: 'Agreed and running', stages: ['AGREED'], empty: 'No agreed sponsorships yet.' },
  { key: 'done', title: 'Fulfilled', stages: ['FULFILLED'], empty: '' },
  { key: 'closed', title: 'Closed', stages: ['DECLINED', 'WITHDRAWN', 'CANCELLED'], empty: '' },
];

// Specific next step for an agreed deal, based on what is still missing
const nextStep = (d) => {
  if (d.stage === 'AGREED') {
    if (!d.logoUrl) return 'Choose the logo to use on campaign materials.';
    if (!d.logoUsageApproved) return 'Approve use of your logo so it can be printed and posted.';
    const open = (d.deliverables || []).filter((x) => !['DONE', 'WAIVED'].includes(x.status)).length;
    if (open) return `${open} deliverable${open === 1 ? '' : 's'} still in progress.`;
  }
  return STAGES[d.stage]?.next || '';
};

const DealRow = ({ d }) => {
  const o = d.opportunity || {};
  return (
    <li>
      <Link to={`/sponsor/portal/deals/${d._id}`} className="card card-hover p-4 sm:p-5 flex items-center gap-4">
        <LogoTile url={d.logoUrl} name={d.sponsor?.name} className="w-12 h-12 hidden sm:flex" />
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <Chip map={STAGES} value={d.stage} />
            {o.campaignType && <span className="text-xs text-muted">{CAMPAIGN_TYPES[o.campaignType]}</span>}
          </span>
          <span className="block font-semibold text-ink leading-snug">{o.title || 'Campaign'}</span>
          <span className="block text-sm text-muted">
            {d.sponsor?.name}
            {d.tier ? ` · ${d.tier.name}` : ' · Custom package'}
            {dateRange(o.startDate, o.endDate) ? ` · ${dateRange(o.startDate, o.endDate)}` : ''}
          </span>
          <span className="block text-sm text-ink-soft">{nextStep(d)}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
      </Link>
    </li>
  );
};

const SponsorPortal = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [accounts, setAccounts] = useState(null);
  const [deals, setDeals] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    API.get('/sponsorship/accounts/mine').then((r) => setAccounts(r.data?.data || [])).catch(() => setAccounts([]));
    API.get('/sponsorship/deals/mine').then((r) => setDeals(r.data?.data || [])).catch(() => setDeals([]));
  };
  useEffect(load, []);

  const createAccount = async (payload) => {
    setSaving(true);
    try {
      const res = await API.post('/sponsorship/accounts', payload);
      showToast(res.data.message || 'Sponsor account created', 'success');
      setCreateOpen(false);
      setAccounts((prev) => [res.data.data, ...(prev || [])]);
    } catch (err) {
      showToast(errMsg(err, 'Could not create the sponsor account'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const loading = accounts === null || deals === null;

  return (
    <div className="pb-10">
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-10 pb-10 sm:pb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 animate-rise">
          <div className="space-y-3 max-w-2xl">
            <span className="eyebrow deva">प्रायोजक पोर्टल</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Sponsor portal</h1>
            <p className="text-muted text-lg">
              Namaste{user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Manage your organisations, follow each proposal, approve logo use and read impact reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/sponsor#opportunities" className="btn btn-primary"><Search className="w-4 h-4" aria-hidden="true" /> Find a campaign</Link>
            <Link to="/sponsor/ads" className="btn btn-ghost"><Megaphone className="w-4 h-4" aria-hidden="true" /> Ad campaigns</Link>
            <Link to="/sponsor/invoices" className="btn btn-ghost"><ReceiptText className="w-4 h-4" aria-hidden="true" /> Invoices</Link>
            <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-ghost"><Plus className="w-4 h-4" aria-hidden="true" /> Register organisation</button>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="container-page pt-10 grid lg:grid-cols-3 gap-8" aria-busy="true" aria-label="Loading sponsor portal">
          <div className="h-72 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
          <div className="lg:col-span-2 h-96 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />
        </div>
      ) : (
        <div className="container-page pt-10 grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
          {/* Accounts */}
          <section aria-labelledby="acc-h" className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <h2 id="acc-h" className="text-2xl font-bold text-ink">My organisations</h2>
              <button type="button" onClick={() => setCreateOpen(true)} className="w-10 h-10 rounded-full border border-sand bg-white flex items-center justify-center hover:border-ink/40" aria-label="Register an organisation">
                <Plus className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {accounts.length === 0 ? (
              <div className="card p-6 text-center space-y-3">
                <span className="mx-auto w-12 h-12 rounded-2xl bg-pine-tint text-pine flex items-center justify-center"><Building2 className="w-6 h-6" aria-hidden="true" /></span>
                <h3 className="font-semibold text-ink">Register your organisation</h3>
                <p className="text-sm text-muted">A sponsor account holds your logos and team, and is verified by our team before your name is shown publicly.</p>
                <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Get started</button>
              </div>
            ) : (
              <ul className="space-y-3">
                {accounts.map((a, i) => (
                  <Reveal as="li" key={a._id} delay={i * 60}>
                    <Link to={`/sponsor/portal/accounts/${a._id}`} className="card card-hover p-4 flex items-center gap-3">
                      <LogoTile url={a.logos?.[0]?.url} name={a.name} className="w-14 h-14" />
                      <span className="min-w-0 flex-1 space-y-1">
                        <span className="block font-semibold text-ink truncate">{a.name}</span>
                        <span className="block text-xs text-muted">{ACCOUNT_TYPES[a.type] || a.type} · You are {a.myRole?.toLowerCase()}</span>
                        <Chip map={VERIFICATION} value={a.verificationStatus} />
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
                    </Link>
                  </Reveal>
                ))}
              </ul>
            )}
            <div className="surface-sunken p-4 text-sm text-ink-soft flex gap-3">
              <Users className="w-5 h-5 text-pine shrink-0" aria-hidden="true" />
              <span>Owners can add colleagues as editors (can apply and approve logos) or viewers (read-only).</span>
            </div>
            {accounts.length > 0 && (
              <Link to="/sponsor/ads" className="card card-hover p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-sky-tint text-sky-ink flex items-center justify-center shrink-0"><Megaphone className="w-5 h-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">Ad campaigns</span>
                  <span className="block text-xs text-muted">Run labelled sponsored ads on the website and app, with measured reports.</span>
                </span>
                <ChevronRight className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
              </Link>
            )}
            {accounts.length > 0 && (
              <Link to="/sponsor/invoices" className="card card-hover p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-pine-tint text-pine flex items-center justify-center shrink-0"><ReceiptText className="w-5 h-5" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-ink">Invoices</span>
                  <span className="block text-xs text-muted">Invoices issued to your organisations, payments received and what is still due.</span>
                </span>
                <ChevronRight className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
              </Link>
            )}
          </section>

          {/* Deals */}
          <section aria-labelledby="deals-h" className="lg:col-span-2 space-y-8 min-w-0">
            <h2 id="deals-h" className="text-2xl font-bold text-ink">My sponsorships</h2>
            {deals.length === 0 ? (
              <div className="card p-8 sm:p-10 text-center space-y-3">
                <span className="mx-auto w-14 h-14 rounded-2xl bg-sky-tint text-sky-ink flex items-center justify-center"><Briefcase className="w-7 h-7" aria-hidden="true" /></span>
                <h3 className="text-xl font-semibold text-ink">No proposals yet</h3>
                <p className="text-muted max-w-md mx-auto">Browse campaigns that are open to sponsors and send your first proposal. It will appear here with every update.</p>
                <Link to="/sponsor#opportunities" className="btn btn-primary">See open campaigns <ArrowRight className="w-4 h-4" aria-hidden="true" /></Link>
              </div>
            ) : (
              GROUPS.map((g) => {
                const list = deals.filter((d) => g.stages.includes(d.stage));
                if (!list.length && !g.empty) return null;
                return (
                  <div key={g.key} className="space-y-3">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-muted flex items-center gap-2">
                      <FileText className="w-4 h-4" aria-hidden="true" /> {g.title} <span className="chip bg-paper-deep text-ink-soft">{list.length}</span>
                    </h3>
                    {list.length ? (
                      <ul className="space-y-3">{list.map((d) => <DealRow key={d._id} d={d} />)}</ul>
                    ) : (
                      <p className="text-sm text-muted">{g.empty}</p>
                    )}
                  </div>
                );
              })
            )}
          </section>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} labelledBy="create-acc-title" wide>
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-sand pr-16">
          <span className="eyebrow">New sponsor account</span>
          <h2 id="create-acc-title" className="text-2xl font-bold text-ink mt-1">Register your organisation</h2>
          <p className="text-sm text-muted mt-1">You'll be the owner. Our team verifies new organisations before their name appears publicly.</p>
        </div>
        <div className="px-6 sm:px-8 py-6">
          <AccountForm idPrefix="portal-acc" onSubmit={createAccount} saving={saving} submitLabel="Create sponsor account" onCancel={() => setCreateOpen(false)} />
        </div>
      </Modal>
    </div>
  );
};

export default SponsorPortal;
