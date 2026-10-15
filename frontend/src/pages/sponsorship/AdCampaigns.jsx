import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { Reveal } from '../../components/ui/motion';
import { BackLink, Chip, LogoTile, VERIFICATION, dateRange } from '../../components/sponsorship/shared';
import { AdChip, num, nprAd, pct, priceLine } from '../../components/ads/adShared';
import { Building2, ChevronRight, Megaphone, Plus } from 'lucide-react';

const CampaignRow = ({ c }) => (
  <li>
    <Link to={`/sponsor/ads/${c._id}`} className="card card-hover p-4 sm:p-5 flex items-center gap-4">
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className="flex flex-wrap items-center gap-2">
          <AdChip value={c.deliveryStatus} />
          {c.status === 'PAUSED' && c.pausedByStaff && <span className="chip bg-brand-tint text-brand">Paused by our team</span>}
        </span>
        <span className="block font-semibold text-ink leading-snug">{c.title}</span>
        <span className="block text-sm text-muted">
          {dateRange(c.startDate, c.endDate)}
          {c.placements?.length ? ` · ${c.placements.length} placement${c.placements.length === 1 ? '' : 's'}` : ' · no placement yet'}
          {` · ${priceLine(c)}`}
        </span>
        <span className="grid grid-cols-3 gap-2 pt-1 text-sm sm:max-w-md">
          <span>
            <span className="block text-xs text-muted">Impressions</span>
            <span className="font-semibold tabular-nums text-ink">{num(c.totals?.impressions)}</span>
          </span>
          <span>
            <span className="block text-xs text-muted">CTR</span>
            <span className="font-semibold tabular-nums text-ink">{pct(c.ctr)}</span>
          </span>
          <span>
            <span className="block text-xs text-muted">Spend</span>
            <span className="font-semibold tabular-nums text-ink">{nprAd(c.spend)}</span>
          </span>
        </span>
      </span>
      <ChevronRight className="w-5 h-5 text-muted shrink-0" aria-hidden="true" />
    </Link>
  </li>
);

/** /sponsor/ads — ad campaigns of every sponsor account I belong to */
const AdCampaigns = () => {
  const [accounts, setAccounts] = useState(null);
  const [campaigns, setCampaigns] = useState(null);
  const [account, setAccount] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    API.get('/sponsorship/accounts/mine').then((r) => setAccounts(r.data?.data || [])).catch(() => setAccounts([]));
    API.get('/ads/campaigns/mine').then((r) => setCampaigns(r.data?.data || [])).catch(() => setCampaigns([]));
  }, []);

  const loading = accounts === null || campaigns === null;
  const canCreate = (accounts || []).some((a) => ['OWNER', 'EDITOR'].includes(a.myRole));
  const archivedCount = (campaigns || []).filter((c) => c.status === 'ARCHIVED').length;

  const groups = useMemo(() => {
    if (loading) return [];
    return accounts
      .filter((a) => !account || a._id === account)
      .map((a) => ({
        account: a,
        list: campaigns.filter((c) => String(c.advertiser?._id || c.advertiser) === String(a._id) && (showArchived || c.status !== 'ARCHIVED')),
      }));
  }, [loading, accounts, campaigns, account, showArchived]);

  return (
    <div className="pb-16">
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-8 pb-10 space-y-5 animate-rise">
          <BackLink to="/sponsor/portal">Sponsor portal</BackLink>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="eyebrow deva">विज्ञापन</span>
              <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">Ad campaigns</h1>
              <p className="text-muted text-lg">
                Show a clearly labelled sponsored message on Hateymalo's website and app. Every ad is reviewed before it runs, and you only see real, measured numbers here.
              </p>
            </div>
            {canCreate && (
              <Link to="/sponsor/ads/new" className="btn btn-primary self-start md:self-auto">
                <Plus className="w-4 h-4" aria-hidden="true" /> New ad campaign
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="container-page pt-8 space-y-8">
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-label="Loading ad campaigns">
            {[0, 1, 2].map((n) => <div key={n} className="h-32 bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />)}
          </div>
        ) : accounts.length === 0 ? (
          <div className="card max-w-lg mx-auto p-8 sm:p-10 text-center space-y-3">
            <span className="mx-auto w-14 h-14 rounded-2xl bg-pine-tint text-pine flex items-center justify-center"><Building2 className="w-7 h-7" aria-hidden="true" /></span>
            <h2 className="text-xl font-semibold text-ink">Register your organisation first</h2>
            <p className="text-muted">Ads run under a verified sponsor account. Create one in the sponsor portal; our team verifies it before any ad goes live.</p>
            <Link to="/sponsor/portal" className="btn btn-primary">Go to the sponsor portal</Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
              {accounts.length > 1 ? (
                <div className="w-full sm:max-w-xs">
                  <label htmlFor="ads-account" className="field-label">Sponsor account</label>
                  <select id="ads-account" className="field" value={account} onChange={(e) => setAccount(e.target.value)}>
                    <option value="">All my accounts</option>
                    {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                  </select>
                </div>
              ) : <span />}
              {archivedCount > 0 && (
                <label htmlFor="ads-archived" className="inline-flex items-center gap-2 text-sm text-ink-soft cursor-pointer">
                  <input id="ads-archived" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} className="h-5 w-5 accent-[#B5232C]" />
                  Show archived ({archivedCount})
                </label>
              )}
            </div>

            {groups.map(({ account: a, list }, gi) => (
              <Reveal as="section" key={a._id} delay={gi * 60} aria-labelledby={`acc-${a._id}`} className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <LogoTile url={a.logos?.[0]?.url} name={a.name} className="w-10 h-10" />
                  <h2 id={`acc-${a._id}`} className="text-xl font-bold text-ink">{a.name}</h2>
                  <Chip map={VERIFICATION} value={a.verificationStatus} />
                  <span className="text-xs text-muted">You are {a.myRole?.toLowerCase()}</span>
                </div>
                {a.verificationStatus !== 'VERIFIED' && (
                  <p className="text-sm text-ink-soft surface-sunken px-4 py-3">
                    {a.verificationStatus === 'REJECTED'
                      ? 'This account was not verified, so it cannot advertise. Contact our team if you think this is a mistake.'
                      : 'You can prepare and submit campaigns now. They can only be approved once our team has verified this account.'}
                  </p>
                )}
                {list.length ? (
                  <ul className="space-y-3">{list.map((c) => <CampaignRow key={c._id} c={c} />)}</ul>
                ) : (
                  <div className="card p-6 sm:p-8 text-center space-y-3">
                    <span className="mx-auto w-12 h-12 rounded-2xl bg-sky-tint text-sky-ink flex items-center justify-center"><Megaphone className="w-6 h-6" aria-hidden="true" /></span>
                    <p className="text-muted">No ad campaigns for {a.name} yet.</p>
                    {['OWNER', 'EDITOR'].includes(a.myRole) && a.verificationStatus !== 'REJECTED' && (
                      <Link to={`/sponsor/ads/new?account=${a._id}`} className="btn btn-primary btn-sm">
                        <Plus className="w-4 h-4" aria-hidden="true" /> Create a campaign
                      </Link>
                    )}
                  </div>
                )}
              </Reveal>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default AdCampaigns;
