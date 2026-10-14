import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Reveal, Tilt } from '../../components/ui/motion';
import {
  CAMPAIGN_TYPES,
  FundingBar,
  LogoTile,
  dateRange,
  npr,
  safeUrl,
} from '../../components/sponsorship/shared';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarDays,
  FileSignature,
  FileText,
  HeartHandshake,
  Layers,
  MapPin,
  Megaphone,
  Shirt,
  Users,
  Eye,
  Briefcase,
} from 'lucide-react';

const WHY = [
  {
    icon: Eye,
    title: 'Transparent',
    body: 'Cash, in-kind goods and services are recorded separately. You see what was agreed, what was received and where your logo appears.',
    tone: 'bg-pine-tint text-pine',
  },
  {
    icon: BarChart3,
    title: 'Measurable',
    body: 'Each sponsorship has a deliverables checklist with proof links, and an impact report is shared with you when the campaign wraps up.',
    tone: 'bg-marigold-tint text-marigold-text',
  },
  {
    icon: HeartHandshake,
    title: 'Community-centred',
    body: 'Campaigns are planned by local organisers and volunteers. Sponsors fund the work; the community leads it.',
    tone: 'bg-brand-tint text-brand',
  },
];

const STEPS = [
  { icon: FileText, title: 'Send a proposal', body: 'Pick a tier or describe a custom package: cash, goods, transport, venue or media.' },
  { icon: FileSignature, title: 'Agree the terms', body: 'Talk it through with the team in your sponsor portal, then confirm an agreement.' },
  { icon: Shirt, title: 'Be seen on the ground', body: 'With your approval, your logo goes on vests, banners, backdrops and social posts.' },
  { icon: BarChart3, title: 'Receive the impact report', body: 'Deliverables are ticked off with proof, and a report is shared when the campaign closes.' },
];

const OpportunityCard = ({ o }) => {
  const cover = safeUrl(o.coverImage);
  const dates = dateRange(o.startDate, o.endDate);
  const sponsors = o.sponsors || [];
  return (
    <Tilt max={4} className="h-full rounded-[var(--radius-card)]">
      <article className="card card-hover h-full flex flex-col overflow-hidden">
        <Link to={`/sponsor/opportunities/${o._id}`} className="block relative aspect-[16/9] bg-paper-deep overflow-hidden rounded-none" tabIndex={-1} aria-hidden="true">
          {cover ? (
            <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
          ) : (
            <div className="w-full h-full grain flex items-center justify-center bg-gradient-to-br from-paper-deep to-sand">
              <Megaphone className="w-10 h-10 text-muted/60" aria-hidden="true" />
            </div>
          )}
          <span className="absolute top-3 left-3 chip bg-white/95 text-ink shadow-[var(--shadow-soft)]">{CAMPAIGN_TYPES[o.campaignType] || 'Campaign'}</span>
        </Link>
        <div className="p-5 sm:p-6 flex flex-col flex-1 gap-4">
          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-ink leading-snug">
              <Link to={`/sponsor/opportunities/${o._id}`} className="hover:text-brand transition-colors rounded">
                {o.title}
              </Link>
            </h3>
            {o.summary && <p className="text-sm text-muted line-clamp-2">{o.summary}</p>}
          </div>
          <ul className="space-y-1.5 text-sm text-ink-soft">
            {dates && (
              <li className="flex items-center gap-2"><CalendarDays className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> {dates}</li>
            )}
            {o.location && (
              <li className="flex items-center gap-2 min-w-0"><MapPin className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> <span className="truncate">{o.location}</span></li>
            )}
            {o.expectedAudience?.count > 0 && (
              <li className="flex items-center gap-2"><Users className="w-4 h-4 text-brand shrink-0" aria-hidden="true" /> About {o.expectedAudience.count.toLocaleString('en-IN')} people expected</li>
            )}
          </ul>

          <div className="mt-auto space-y-4">
            <FundingBar pct={o.fundingSecuredPct} label={`${o.title}: ${o.fundingSecuredPct}% of funding secured`} />
            <div className="flex items-end justify-between gap-3 pt-1 border-t border-sand">
              <div className="pt-3">
                <span className="text-xs text-muted block">{o.tierCount ? `${o.tierCount} package${o.tierCount === 1 ? '' : 's'}` : 'Custom packages'}</span>
                <span className="font-display text-lg font-bold text-ink">
                  {o.startingPrice ? <>From {npr(o.startingPrice)}</> : 'By quotation'}
                </span>
              </div>
              {sponsors.length > 0 && (
                <div className="flex -space-x-2 pt-3" aria-label={`Sponsors: ${sponsors.map((s) => s.name).join(', ')}`}>
                  {sponsors.slice(0, 4).map((s) => (
                    <LogoTile key={s.deal} url={s.logoUrl} name={s.name} className="w-9 h-9 !rounded-full ring-2 ring-white" />
                  ))}
                  {sponsors.length > 4 && (
                    <span className="w-9 h-9 rounded-full ring-2 ring-white bg-paper-deep text-xs font-semibold text-ink-soft flex items-center justify-center">+{sponsors.length - 4}</span>
                  )}
                </div>
              )}
            </div>
            <Link to={`/sponsor/opportunities/${o._id}`} className="btn btn-primary btn-sm w-full">
              View proposal <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </article>
    </Tilt>
  );
};

const SponsorLanding = () => {
  const { isAuthenticated } = useAuth();
  const [type, setType] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    API.get('/sponsorship/opportunities', { params: { status: 'OPEN', ...(type ? { campaignType: type } : {}) } })
      .then((res) => alive && setItems(res.data?.data || []))
      .catch(() => alive && setError(true))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [type, reload]);

  const portalCta = isAuthenticated ? '/sponsor/portal' : '/login';

  return (
    <div className="pb-8">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="absolute -top-24 -right-24 w-[28rem] h-[28rem] rounded-full bg-marigold/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-32 -left-24 w-[24rem] h-[24rem] rounded-full bg-pine/10 blur-3xl" aria-hidden="true" />
        <div className="container-page relative pt-10 sm:pt-16 pb-14 sm:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5 animate-rise">
            <span className="eyebrow deva">प्रायोजन · Campaign sponsorship</span>
            <h1 className="text-4xl sm:text-5xl font-bold text-ink leading-[1.08]">
              Sponsor a community campaign, and see exactly what it made possible.
            </h1>
            <p className="text-muted text-lg max-w-2xl">
              Back clean-ups, blood drives, tree planting and relief work organised by volunteers across Nepal. Your support is agreed in writing,
              your brand is shown only with your approval, and every deliverable is tracked to completion.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#opportunities" className="btn btn-primary btn-lg">
                See open campaigns <ArrowRight className="w-5 h-5" aria-hidden="true" />
              </a>
              <Link to={portalCta} className="btn btn-ghost btn-lg">
                <Briefcase className="w-5 h-5" aria-hidden="true" /> {isAuthenticated ? 'Open sponsor portal' : 'Log in to the sponsor portal'}
              </Link>
            </div>
            <p className="text-sm text-muted max-w-xl">
              Sponsorship funds organised campaigns only. Personal help requests on Hateymalo are never sponsored or branded.
            </p>
          </div>

          {/* Layered "how your support shows up" card stack */}
          <div className="lg:col-span-5 relative hidden sm:block animate-rise" aria-hidden="true">
            <div className="relative mx-auto max-w-sm">
              <div className="absolute inset-0 translate-x-6 translate-y-6 rotate-3 card bg-pine-tint/70" />
              <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-1 card bg-marigold-tint/80" />
              <div className="relative card p-6 space-y-5 shadow-[var(--shadow-lift)]">
                <div className="flex items-center justify-between">
                  <span className="chip bg-pine-tint text-pine"><BadgeCheck className="w-3.5 h-3.5" /> Agreement confirmed</span>
                  <Layers className="w-5 h-5 text-muted" />
                </div>
                <div className="space-y-3">
                  {['Logo on volunteer vests', 'Venue banner', 'Social media mention', 'Impact report'].map((t, i) => (
                    <div key={t} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? 'bg-pine text-white' : 'bg-paper-deep text-muted'}`}>
                        {i < 2 ? '✓' : i + 1}
                      </span>
                      <span className={`text-sm ${i < 2 ? 'text-ink font-medium' : 'text-muted'}`}>{t}</span>
                    </div>
                  ))}
                </div>
                <div className="surface-sunken p-4 text-sm text-ink-soft">
                  Example of the deliverables checklist every sponsor sees in their portal.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ WHY SPONSOR ============ */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="max-w-2xl space-y-3 mb-10">
          <span className="eyebrow deva">किन प्रायोजन?</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Why sponsor through Hateymalo</h2>
          <p className="text-muted text-lg">Visibility you can verify, for work that genuinely helps a neighbourhood.</p>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-6">
          {WHY.map(({ icon: Icon, title, body, tone }, i) => (
            <Reveal key={title} delay={i * 80}>
              <Tilt max={5} className="card p-6 sm:p-7 h-full space-y-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone}`}>
                  <Icon className="w-6 h-6" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="bg-white border-y border-sand">
        <div className="container-page py-16 sm:py-20">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <span className="eyebrow deva">कसरी काम गर्छ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">From proposal to impact report</h2>
          </Reveal>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <Reveal as="li" key={title} delay={i * 80} className="surface-sunken p-6 space-y-3 relative">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-brand text-white font-display font-bold flex items-center justify-center shadow-[var(--shadow-brand)]">{i + 1}</span>
                  <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-[var(--shadow-soft)]">
                    <Icon className="w-5 h-5 text-ink-soft" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ============ OPPORTUNITIES ============ */}
      <section id="opportunities" className="container-page py-16 sm:py-20 scroll-mt-24">
        <Reveal className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="max-w-2xl space-y-3">
            <span className="eyebrow deva">खुला अवसरहरू</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Campaigns open to sponsors</h2>
            <p className="text-muted text-lg">Each campaign lists its goals, needs and sponsorship packages. Pick one and send a proposal.</p>
          </div>
        </Reveal>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 -mx-1 px-1" role="group" aria-label="Filter by campaign type">
          {[['', 'All campaigns'], ...Object.entries(CAMPAIGN_TYPES)].map(([k, label]) => (
            <button
              key={k || 'all'}
              type="button"
              aria-pressed={type === k}
              onClick={() => setType(k)}
              className={`chip !py-2 !px-4 border shrink-0 transition-colors ${type === k ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-sand hover:border-ink/40'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading campaigns">
            {[1, 2, 3].map((n) => <div key={n} className="h-[26rem] bg-paper-deep animate-pulse rounded-[var(--radius-card)]" />)}
          </div>
        ) : error ? (
          <div className="card p-10 text-center max-w-xl mx-auto space-y-3" role="alert">
            <h3 className="text-xl font-semibold text-ink">We couldn't load campaigns</h3>
            <p className="text-muted">Please check your connection and try again.</p>
            <button type="button" onClick={() => setReload((n) => n + 1)} className="btn btn-ghost">Try again</button>
          </div>
        ) : items.length === 0 ? (
          <div className="card p-10 text-center max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-sky-tint text-sky-ink flex items-center justify-center mx-auto">
              <Megaphone className="w-7 h-7" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-semibold text-ink">
              {type ? `No ${CAMPAIGN_TYPES[type].toLowerCase()} campaigns are open to sponsors right now` : 'No campaigns are open to sponsors right now'}
            </h3>
            <p className="text-muted">
              New campaigns are added as organisers plan them. Register your organisation now and we can let you know through your sponsor portal.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              {type && <button type="button" onClick={() => setType('')} className="btn btn-ghost">Show all types</button>}
              <Link to={portalCta} className="btn btn-primary"><Building2 className="w-4 h-4" aria-hidden="true" /> Register your organisation</Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((o, i) => (
              <Reveal key={o._id} delay={(i % 3) * 80} className="h-full">
                <OpportunityCard o={o} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {/* ============ CLOSING CTA ============ */}
      <section className="container-page">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-night text-white p-8 sm:p-12 shadow-[var(--shadow-lift)]">
            <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-brand/30 blur-3xl" aria-hidden="true" />
            <div className="absolute -left-10 -bottom-24 w-72 h-72 rounded-full bg-marigold/20 blur-3xl" aria-hidden="true" />
            <div className="relative grid lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-8 space-y-3">
                <span className="eyebrow !text-marigold deva">प्रायोजक पोर्टल</span>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Register your organisation once, sponsor any campaign.</h2>
                <p className="text-[#D9D0C4] max-w-2xl">
                  Your sponsor portal keeps your logos, team, proposals, agreements, payments and impact reports in one place. Our team verifies each organisation before its name is shown publicly.
                </p>
              </div>
              <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col gap-3">
                <Link to={portalCta} className="btn btn-primary btn-lg">
                  <Building2 className="w-5 h-5" aria-hidden="true" /> {isAuthenticated ? 'Open sponsor portal' : 'Log in to register'}
                </Link>
                {!isAuthenticated && (
                  <Link to="/register" className="btn btn-light btn-lg">Create a Hateymalo account</Link>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default SponsorLanding;
