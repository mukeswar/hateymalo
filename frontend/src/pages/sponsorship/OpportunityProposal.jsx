import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import { Reveal, Tilt } from '../../components/ui/motion';
import ApplyModal from '../../components/sponsorship/ApplyModal';
import {
  BackLink,
  CAMPAIGN_TYPES,
  Chip,
  FundingBar,
  LOGO_SIZES,
  LogoTile,
  NotFoundCard,
  OPP_STATUS,
  PageSkeleton,
  RESOURCE_TYPES,
  TIER_LEVELS,
  dateRange,
  npr,
  safeUrl,
} from '../../components/sponsorship/shared';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardList,
  ExternalLink,
  HandHeart,
  Lock,
  MapPin,
  Megaphone,
  Package,
  Settings2,
  ShieldAlert,
  Target,
  Users,
  Wrench,
  Send,
} from 'lucide-react';

const Fact = ({ icon: Icon, label, children }) => (
  <div className="flex items-start gap-3 min-w-0">
    <span className="w-10 h-10 shrink-0 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
      <Icon className="w-5 h-5" aria-hidden="true" />
    </span>
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <div className="text-ink font-medium leading-snug break-words">{children}</div>
    </div>
  </div>
);

const TierCard = ({ t, onApply, canApply }) => {
  const lvl = TIER_LEVELS[t.level] || TIER_LEVELS.CUSTOM;
  const soldOut = t.slotsLeft === 0;
  const featured = t.level === 'TITLE';
  return (
    <Tilt max={4} className="h-full rounded-[var(--radius-card)]">
      <article className={`card h-full p-6 flex flex-col gap-4 relative overflow-hidden ${featured ? '!border-ink shadow-[var(--shadow-lift)]' : ''} ${soldOut ? 'opacity-70' : ''}`}>
        {featured && <span className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-marigold to-pine" aria-hidden="true" />}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold text-ink leading-snug">{t.name}</h3>
          <span className={`chip shrink-0 ${lvl.cls}`}>{lvl.label}</span>
        </div>
        <div>
          <p className="font-display text-3xl font-bold text-ink leading-none">{t.price > 0 ? npr(t.price) : 'By quotation'}</p>
          {t.priceNote && <p className="text-sm text-muted mt-1.5">{t.priceNote}</p>}
        </div>
        {t.description && <p className="text-sm text-ink-soft">{t.description}</p>}
        {t.benefits?.length > 0 && (
          <ul className="space-y-2 text-sm text-ink-soft">
            {t.benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-4 h-4 text-pine mt-0.5 shrink-0" aria-hidden="true" /> <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto space-y-3 pt-3 border-t border-sand">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="chip bg-paper-deep text-ink-soft">{LOGO_SIZES[t.logoSize] || 'Logo'}</span>
            <span className={`font-semibold ${soldOut ? 'text-brand' : 'text-pine'}`}>
              {soldOut ? 'Sold out' : t.slotsLeft === null ? 'Open slots' : `${t.slotsLeft} slot${t.slotsLeft === 1 ? '' : 's'} left`}
            </span>
          </div>
          {canApply && (
            <button type="button" disabled={soldOut} onClick={() => onApply(t._id)} className={`btn btn-sm w-full ${featured ? 'btn-primary' : 'btn-ghost'}`}>
              {soldOut ? 'All slots taken' : <>Choose {t.name} <ArrowRight className="w-4 h-4" aria-hidden="true" /></>}
            </button>
          )}
        </div>
      </article>
    </Tilt>
  );
};

const OpportunityProposal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading, can } = useAuth();
  const [opp, setOpp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTier, setApplyTier] = useState(null);

  useEffect(() => {
    if (authLoading) return undefined; // wait so drafts load with the viewer's token
    let alive = true;
    setLoading(true);
    API.get(`/sponsorship/opportunities/${id}`)
      .then((res) => alive && setOpp(res.data?.data || null))
      .catch(() => alive && setOpp(null))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [id, authLoading, isAuthenticated]);

  if (loading || authLoading) return <PageSkeleton label="Loading sponsorship proposal" />;
  if (!opp) {
    return <NotFoundCard title="We couldn't find this campaign" body="It may not be open to sponsors, or the link may be incorrect." to="/sponsor" cta="Back to sponsorship" />;
  }

  const viewer = opp.viewer || {};
  const isStaff = viewer.canManage || viewer.isOrganizer;
  const isOpen = opp.status === 'OPEN';
  const cover = safeUrl(opp.coverImage);
  const dates = dateRange(opp.startDate, opp.endDate);
  const tiers = opp.tiers || [];
  const sponsors = (opp.sponsors || []).slice().sort((a, b) => (a.tier?.order ?? 99) - (b.tier?.order ?? 99));

  const startApply = (tierId = null) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }
    setApplyTier(tierId);
    setApplyOpen(true);
  };

  return (
    <div className="pb-10">
      {/* Staff bar */}
      {isStaff && (
        <div className="bg-night text-white">
          <div className="container-page py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-marigold" aria-hidden="true" />
              You {viewer.canManage ? 'manage sponsorships' : 'organise this campaign'}. Sponsors see this page without this bar.
            </span>
            <span className="flex flex-wrap gap-2">
              <Link to={`/organize/${opp._id}`} className="btn btn-light btn-sm"><Settings2 className="w-4 h-4" aria-hidden="true" /> Organiser workspace</Link>
              {viewer.canManage && can('canManageSponsorships') && (
                <Link to="/admin?tab=sponsorship" className="btn btn-light btn-sm"><ClipboardList className="w-4 h-4" aria-hidden="true" /> Admin dashboard</Link>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-sand">
        {cover ? (
          <>
            <img src={cover} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/75 to-night/30" aria-hidden="true" />
          </>
        ) : (
          <div className="absolute inset-0 bg-paper-deep grain" aria-hidden="true" />
        )}
        <div className={`container-page relative pt-6 pb-12 sm:pb-16 ${cover ? 'text-white' : ''}`}>
          <div className={cover ? '[&_a]:!text-white/80 [&_a:hover]:!text-white' : ''}>
            <BackLink to="/sponsor">All sponsorship opportunities</BackLink>
          </div>
          <div className="mt-10 sm:mt-16 max-w-3xl space-y-4 animate-rise">
            <div className="flex flex-wrap gap-2">
              <span className={`chip ${cover ? 'bg-white/15 text-white backdrop-blur' : 'bg-white text-ink'}`}>{CAMPAIGN_TYPES[opp.campaignType] || 'Campaign'}</span>
              <Chip map={OPP_STATUS} value={opp.status} />
              <span className={`chip ${cover ? 'bg-white/15 text-white backdrop-blur' : 'bg-white text-ink-soft'}`}>Sponsorship proposal</span>
            </div>
            <h1 className={`text-4xl sm:text-5xl font-bold leading-[1.08] ${cover ? 'text-white' : 'text-ink'}`}>{opp.title}</h1>
            {opp.summary && <p className={`text-lg max-w-2xl ${cover ? 'text-white/85' : 'text-muted'}`}>{opp.summary}</p>}
            <div className="flex flex-wrap gap-3 pt-2">
              {isOpen ? (
                <button type="button" onClick={() => startApply()} className="btn btn-primary btn-lg">
                  <HandHeart className="w-5 h-5" aria-hidden="true" /> {isAuthenticated ? 'Apply to sponsor' : 'Log in to apply'}
                </button>
              ) : (
                <span className={`chip !py-2 !px-4 ${cover ? 'bg-white/15 text-white' : 'bg-paper-deep text-ink-soft'}`}><Lock className="w-4 h-4" aria-hidden="true" /> Not taking new sponsors</span>
              )}
              {tiers.length > 0 && <a href="#packages" className={`btn btn-lg ${cover ? 'btn-light' : 'btn-ghost'}`}>See packages</a>}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page pt-10 grid lg:grid-cols-3 gap-8 lg:gap-10 items-start">
        {/* ============ MAIN ============ */}
        <div className="lg:col-span-2 space-y-10 min-w-0">
          {opp.description && (
            <Reveal as="section" aria-labelledby="about-h">
              <h2 id="about-h" className="text-2xl font-bold text-ink mb-3">About the campaign</h2>
              <div className="text-ink-soft leading-relaxed whitespace-pre-line">{opp.description}</div>
            </Reveal>
          )}

          {opp.objectives?.length > 0 && (
            <Reveal as="section" aria-labelledby="obj-h">
              <h2 id="obj-h" className="text-2xl font-bold text-ink mb-4">Objectives</h2>
              <ol className="grid sm:grid-cols-2 gap-3">
                {opp.objectives.map((o, i) => (
                  <li key={i} className="surface-sunken p-4 flex gap-3">
                    <span className="w-8 h-8 rounded-full bg-white text-brand font-display font-bold flex items-center justify-center shrink-0 shadow-[var(--shadow-soft)]">{i + 1}</span>
                    <span className="text-ink-soft text-sm leading-relaxed pt-1">{o}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          )}

          {opp.schedule && (
            <Reveal as="section" aria-labelledby="sch-h">
              <h2 id="sch-h" className="text-2xl font-bold text-ink mb-3">Schedule</h2>
              <div className="card p-5 sm:p-6 text-ink-soft whitespace-pre-line leading-relaxed">{opp.schedule}</div>
            </Reveal>
          )}

          {opp.resourceNeeds?.length > 0 && (
            <Reveal as="section" aria-labelledby="needs-h">
              <h2 id="needs-h" className="text-2xl font-bold text-ink mb-1">What the campaign needs</h2>
              <p className="text-sm text-muted mb-4">In-kind support (goods and services) is welcome alongside cash.</p>
              <ul className="grid sm:grid-cols-2 gap-3">
                {opp.resourceNeeds.map((r, i) => (
                  <li key={r._id || i} className="card p-4 flex items-start gap-3">
                    <span className="w-9 h-9 rounded-xl bg-marigold-tint text-marigold-text flex items-center justify-center shrink-0">
                      {r.type === 'EQUIPMENT' ? <Wrench className="w-4 h-4" aria-hidden="true" /> : <Package className="w-4 h-4" aria-hidden="true" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink break-words">{r.description}</span>
                      <span className="block text-sm text-muted">
                        {RESOURCE_TYPES[r.type] || r.type}
                        {r.quantity ? ` · ${r.quantity.toLocaleString('en-IN')}${r.unit ? ` ${r.unit}` : ''}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </Reveal>
          )}

          {/* Packages */}
          <section id="packages" aria-labelledby="pkg-h" className="scroll-mt-24">
            <Reveal className="mb-5">
              <span className="eyebrow">Sponsorship packages</span>
              <h2 id="pkg-h" className="text-2xl sm:text-3xl font-bold text-ink mt-1">Choose how you'd like to support</h2>
            </Reveal>
            {tiers.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-5">
                {tiers.map((t, i) => (
                  <Reveal key={t._id} delay={(i % 2) * 80} className="h-full">
                    <TierCard t={t} onApply={startApply} canApply={isOpen} />
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="surface-sunken p-6 text-ink-soft">No fixed packages are listed for this campaign. Send a custom proposal describing what you'd like to contribute.</div>
            )}
            {isOpen && (
              <div className="mt-5 card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-br from-white to-paper-deep">
                <div>
                  <h3 className="text-lg font-semibold text-ink">Have something else in mind?</h3>
                  <p className="text-sm text-muted">Propose a custom package: cash, goods, transport, venue, media or a mix.</p>
                </div>
                <button type="button" onClick={() => startApply(null)} className="btn btn-ghost shrink-0">
                  <Send className="w-4 h-4" aria-hidden="true" /> Custom proposal
                </button>
              </div>
            )}
          </section>

          {/* Current sponsors */}
          {sponsors.length > 0 && (
            <Reveal as="section" aria-labelledby="sp-h">
              <h2 id="sp-h" className="text-2xl font-bold text-ink mb-4">Confirmed sponsors</h2>
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {sponsors.map((s) => {
                  const site = safeUrl(s.website);
                  const inner = (
                    <>
                      {s.logoUrl ? <LogoTile url={s.logoUrl} name={s.name} className="w-full h-20" /> : (
                        <span className="w-full h-20 rounded-2xl border border-sand bg-paper flex items-center justify-center px-3 text-center font-display font-semibold text-ink">{s.name}</span>
                      )}
                      <span className="block text-sm font-semibold text-ink mt-2 truncate">{s.name}</span>
                      {s.tier && <span className="block text-xs text-muted">{s.tier.name}</span>}
                    </>
                  );
                  return (
                    <li key={s.deal} className="card p-3">
                      {site ? <a href={site} target="_blank" rel="noopener noreferrer" className="block rounded-xl">{inner}</a> : inner}
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          )}
        </div>

        {/* ============ SIDEBAR ============ */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="card p-6 space-y-5 shadow-[var(--shadow-lift)]">
            {dates && <Fact icon={CalendarDays} label="When">{dates}</Fact>}
            {opp.location && <Fact icon={MapPin} label="Where">{opp.location}</Fact>}
            {(opp.expectedAudience?.count > 0 || opp.expectedAudience?.description) && (
              <Fact icon={Users} label="Expected audience">
                {opp.expectedAudience.count > 0 && <>About {opp.expectedAudience.count.toLocaleString('en-IN')} people</>}
                {opp.expectedAudience.description && <span className="block text-sm text-muted font-normal">{opp.expectedAudience.description}</span>}
              </Fact>
            )}
            {opp.fundingGoal > 0 && (
              <div className="pt-4 border-t border-sand space-y-3">
                <Fact icon={Target} label="Funding goal">{npr(opp.fundingGoal)}</Fact>
                <FundingBar pct={opp.fundingSecuredPct ?? 0} />
              </div>
            )}
            {isOpen && (
              <button type="button" onClick={() => startApply()} className="btn btn-primary w-full">
                <HandHeart className="w-4 h-4" aria-hidden="true" /> {isAuthenticated ? 'Apply to sponsor' : 'Log in to apply'}
              </button>
            )}
          </div>

          {(opp.event || opp.donationCampaign) && (
            <div className="card p-6 space-y-3">
              <h2 className="text-lg font-semibold text-ink">Linked on Hateymalo</h2>
              {opp.event && (
                <Link to={`/events/${opp.event._id}`} className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-sand hover:border-ink/30 transition-colors">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">Volunteer event</span>
                    <span className="block font-semibold text-ink truncate">{opp.event.title}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                </Link>
              )}
              {opp.donationCampaign && (
                <Link to="/donate#campaigns" className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-sand hover:border-ink/30 transition-colors">
                  <span className="min-w-0">
                    <span className="block text-xs text-muted">Public donation campaign</span>
                    <span className="block font-semibold text-ink truncate">{opp.donationCampaign.title}</span>
                  </span>
                  <ExternalLink className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {opp.organizers?.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-ink mb-3">Organisers</h2>
              <ul className="space-y-3">
                {opp.organizers.map((o) => (
                  <li key={o._id}>
                    <Link to={`/profile/${o._id}`} className="flex items-center gap-3 rounded-xl hover:bg-paper p-1 -m-1">
                      <Avatar name={o.name} src={o.profilePicture} size="md" />
                      <span className="font-semibold text-ink">{o.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="surface-sunken p-5 text-sm text-ink-soft space-y-2">
            <p className="font-semibold text-ink flex items-center gap-2"><Megaphone className="w-4 h-4 text-brand" aria-hidden="true" /> How sponsorship works</p>
            <p>Your logo is used only after you approve it. Cash and in-kind support are recorded separately, deliverables are tracked with proof, and an impact report is shared when the campaign ends.</p>
          </div>
        </aside>
      </div>

      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} opportunity={opp} initialTier={applyTier} />
    </div>
  );
};

export default OpportunityProposal;
