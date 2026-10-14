import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import PostCard from '../components/PostCard';
import VerificationBadge from '../components/VerificationBadge';
import Avatar from '../components/ui/Avatar';
import { Reveal, Tilt, CountUp, useParallax } from '../components/ui/motion';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  ArrowRight,
  ArrowUpRight,
  HandHeart,
  HandHelping,
  HeartHandshake,
  ShieldCheck,
  CalendarDays,
  MapPin,
  Clock,
  Megaphone,
  Plus,
  Minus,
  BadgeCheck,
  ReceiptText,
  Flag,
  Users,
  Building2,
  Sparkles,
} from 'lucide-react';

// Authentic, free-licensed photography from Nepal (Unsplash License).
const IMG = {
  gathering: 'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1200&q=75',
  neighbours: 'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=700&q=75',
  children: 'https://images.unsplash.com/photo-1763735135003-6710ca6872ea?auto=format&fit=crop&w=600&q=75',
  terraces: 'https://images.unsplash.com/photo-1572109801525-0bb0272e8579?auto=format&fit=crop&w=1800&q=70',
};

// The CMS default hero image predates the redesign; only use the CMS value when an admin changed it.
const LEGACY_DEFAULT_HERO = 'photo-1593113598332';

const stripHtml = (s = '') => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const npr = (n) => `रु ${Number(n || 0).toLocaleString('en-IN')}`;

const SectionHeader = ({ eyebrow, title, intro, action }) => (
  <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
    <div className="max-w-2xl space-y-3">
      <span className="eyebrow deva">{eyebrow}</span>
      <h2 className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-ink leading-[1.1]">{title}</h2>
      {intro && <p className="text-muted text-base sm:text-lg leading-relaxed">{intro}</p>}
    </div>
    {action}
  </Reveal>
);

const ViewAll = ({ to, children }) => (
  <Link to={to} className="group inline-flex items-center gap-1.5 font-semibold text-ink hover:text-brand transition-colors shrink-0">
    {children}
    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
  </Link>
);

const Home = () => {
  const [latestPosts, setLatestPosts] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [latestBlogs, setLatestBlogs] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFaq, setActiveFaq] = useState(0);

  const { settings } = useSettings();
  const { isAuthenticated } = useAuth();
  const donationsOn = settings?.allowPublicDonations !== false;

  const backLayer = useParallax(0.05);
  const frontLayer = useParallax(-0.06);

  useEffect(() => {
    const safe = (p) => p.catch(() => null);
    const fetchData = async () => {
      try {
        const [postsRes, featuredRes, eventsRes, blogsRes, annRes, statsRes, campaignsRes, orgsRes] = await Promise.all([
          safe(API.get('/posts?sort=newest')),
          safe(API.get('/posts?featured=true')),
          safe(API.get('/events?status=UPCOMING')),
          safe(API.get('/blogs')),
          safe(API.get('/announcements')),
          safe(API.get('/stats')),
          safe(API.get('/donations/campaigns')),
          safe(API.get('/search?entityType=ORGANIZATIONS')),
        ]);

        if (postsRes?.data.success) setLatestPosts(postsRes.data.data);
        if (featuredRes?.data.success) setFeaturedPosts(featuredRes.data.data);
        if (eventsRes?.data.success) setUpcomingEvents(eventsRes.data.data.slice(0, 3));
        if (blogsRes?.data.success) setLatestBlogs(blogsRes.data.data.slice(0, 3));
        if (annRes?.data.success) setAnnouncements(annRes.data.data);
        if (statsRes?.data.success) setStats(statsRes.data.data);
        if (campaignsRes?.data.success) setCampaigns(campaignsRes.data.data.filter((c) => c.status === 'ACTIVE').slice(0, 3));
        if (orgsRes?.data.success) setOrganizations((orgsRes.data.data.organizations || []).slice(0, 4));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Admin-featured posts first, then the newest ones, without duplicates.
  const openRequests = [...featuredPosts, ...latestPosts.filter((p) => !featuredPosts.some((f) => f._id === p._id))].slice(0, 6);

  // Real people who recently asked for or organised help — used as social proof.
  const recentPeople = [];
  latestPosts.forEach((p) => {
    if (p.creator && !recentPeople.some((x) => x._id === p.creator._id)) recentPeople.push(p.creator);
  });

  const heroImage =
    settings?.heroImage && !settings.heroImage.includes(LEGACY_DEFAULT_HERO) ? settings.heroImage : IMG.gathering;
  const heroLines = (settings?.heroHeadline || 'मद्दत मागौँ।\nसहयोग गरौँ।\nसँगै परिवर्तन ल्याऔँ।')
    .split(/\n|(?<=।)\s+/)
    .filter(Boolean);
  const latestActivity = latestPosts[0];

  const impact = [
    { label: 'Community members', ne: 'सदस्य', value: stats?.totalMembers, icon: Users, tone: 'text-ink' },
    { label: 'Helpers who joined a drive', ne: 'सहयोगी', value: stats?.peopleConnected, icon: HandHelping, tone: 'text-brand' },
    { label: 'Activities organised', ne: 'गतिविधि', value: stats?.totalActivities, icon: Sparkles, tone: 'text-marigold-text' },
    { label: 'Places reached', ne: 'स्थान', value: stats?.communitiesReached, icon: MapPin, tone: 'text-pine' },
  ];

  const faqs = [
    {
      q: 'Is Hateymalo free to use?',
      a: 'Yes. Creating an account, asking for help, offering help, joining activities and registering an organisation are all free. Donations are always voluntary.',
    },
    {
      q: 'How do you keep posts genuine and safe?',
      a: 'Every help request is reviewed by a moderator before it goes public. Posts that are commercial, misleading or unsafe are rejected with a reason, and anyone can report a post, comment or profile for review.',
    },
    {
      q: 'Can I organise a drive or event in my own town or village?',
      a: 'Yes. Any registered member can post a help request or community activity anywhere in Nepal — a clean-up, tutoring, a blood donation camp, relief collection, and more.',
    },
    {
      q: 'What do member levels and badges mean?',
      a: 'As you take part, your profile shows your contribution: members grow from New Member to Trusted and Verified Member, and earn badges for the kind of help they give. Verified accounts are checked by the Hateymalo team.',
    },
    {
      q: 'How can an NGO or community group get verified?',
      a: 'Register as an organisation with your official details. Once the Hateymalo team verifies them, your profile shows a verified badge and appears in the organisation directory.',
    },
  ];

  return (
    <div className="overflow-x-clip">
      {/* ANNOUNCEMENT */}
      {announcements.length > 0 && (
        <div className="bg-marigold-tint border-b border-marigold/30">
          <div className="container-page py-2.5 flex items-center justify-center gap-2.5 text-sm text-ink-soft">
            <Megaphone className="w-4 h-4 text-marigold-text shrink-0" aria-hidden="true" />
            <span className="font-semibold text-ink">{announcements[0].title}</span>
            <span className="hidden sm:inline truncate text-muted">— {announcements[0].content}</span>
          </div>
        </div>
      )}

      {/* ============ HERO ============ */}
      <section className="relative grain">
        <div className="container-page pt-10 sm:pt-16 lg:pt-20 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-6 xl:col-span-6 space-y-7 relative z-10">
            <span className="chip bg-white border border-sand text-ink-soft shadow-sm animate-in animate-rise">
              <span className="w-2 h-2 rounded-full bg-pine" aria-hidden="true" />
              {settings?.heroSmallLabel || 'Together, we can make a difference'}
            </span>

            <h1 className="deva font-display font-bold text-ink text-[2.6rem] leading-[1.15] sm:text-6xl sm:leading-[1.1] xl:text-[4.3rem] tracking-tight">
              {heroLines.map((line, i) => (
                <span
                  key={i}
                  className={`block animate-in animate-rise ${i === heroLines.length - 1 ? 'text-brand' : ''}`}
                  style={{ animationDelay: `${120 + i * 110}ms` }}
                >
                  {line}
                </span>
              ))}
            </h1>

            <p className="text-lg sm:text-xl text-muted leading-relaxed max-w-xl animate-in animate-rise" style={{ animationDelay: '480ms' }}>
              {settings?.heroDescription ||
                'Hateymalo is a community platform where people can ask for help, offer their skills, join meaningful activities, and create positive change together.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 animate-in animate-rise" style={{ animationDelay: '600ms' }}>
              <Link to="/explore" className="btn btn-primary btn-lg">
                <HandHeart className="w-5 h-5" aria-hidden="true" /> I want to help
              </Link>
              <Link to={isAuthenticated ? '/create-post' : '/register'} className="btn btn-ghost btn-lg">
                <HandHelping className="w-5 h-5" aria-hidden="true" /> I need help
              </Link>
            </div>

            {recentPeople.length > 0 && (
              <div className="flex items-center gap-4 pt-2 animate-in" style={{ animationDelay: '750ms' }}>
                <div className="flex -space-x-2.5">
                  {recentPeople.slice(0, 4).map((p) => (
                    <Avatar key={p._id} name={p.name} src={p.profilePicture} size="md" className="ring-[3px] ring-paper" />
                  ))}
                </div>
                <p className="text-sm text-muted leading-snug">
                  <strong className="text-ink font-semibold">
                    {stats?.totalMembers ? `${stats.totalMembers.toLocaleString()} neighbours` : 'Neighbours'}
                  </strong>{' '}
                  are already helping each other here.
                </p>
              </div>
            )}
          </div>

          {/* Layered photo composition */}
          <div className="lg:col-span-6 xl:col-span-6 relative h-[420px] sm:h-[520px] lg:h-[600px]" aria-hidden="true">
            <div ref={backLayer} className="absolute right-0 top-0 w-[78%] h-[86%]">
              <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-[var(--shadow-lift)] animate-in animate-pop">
                <img src={heroImage} alt="" className="w-full h-full object-cover" fetchpriority="high" />
              </div>
            </div>

            <div ref={frontLayer} className="absolute left-0 bottom-0 w-[46%] h-[52%]">
              <div className="w-full h-full rounded-[1.6rem] overflow-hidden border-[6px] border-paper shadow-[var(--shadow-lift)] animate-in animate-pop" style={{ animationDelay: '200ms' }}>
                <img src={IMG.neighbours} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="absolute left-[6%] top-[10%] w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-[5px] border-paper shadow-[var(--shadow-lift)] animate-float hidden sm:block">
              <img src={IMG.children} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Live stat chip */}
            <div className="absolute right-[4%] bottom-[20%] sm:bottom-[16%] card !rounded-2xl px-4 py-3 flex items-center gap-3 animate-in animate-rise" style={{ animationDelay: '700ms' }}>
              <span className="w-10 h-10 rounded-xl bg-brand-tint text-brand flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </span>
              <span>
                <span className="block font-display text-2xl font-bold text-ink leading-none">
                  <CountUp value={stats?.peopleConnected} />
                </span>
                <span className="block text-xs text-muted mt-1">helpers joined community drives</span>
              </span>
            </div>
          </div>
        </div>

        {/* Latest activity ticker — real, newest public request */}
        {latestActivity && (
          <div className="container-page -mt-6 pb-4 relative z-10">
            <Link
              to={`/post/${latestActivity._id}`}
              className="group card card-hover flex items-center gap-4 p-3 pr-5 max-w-2xl"
            >
              <span className="chip bg-pine-tint text-pine shrink-0">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-pine opacity-60 motion-safe:animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-pine" />
                </span>
                Latest
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink truncate group-hover:text-brand transition-colors">{latestActivity.title}</span>
                <span className="block text-xs text-muted truncate">
                  {latestActivity.location} · {latestActivity.joinedUsers?.length || 0} joined
                </span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted group-hover:text-brand shrink-0" aria-hidden="true" />
            </Link>
          </div>
        )}
      </section>

      {/* ============ WAYS TO TAKE PART ============ */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeader
          eyebrow="तपाईं कसरी जोडिन सक्नुहुन्छ"
          title="Every hand matters. Find yours."
          intro="Whether you have an hour, a skill, or simply need a neighbour — there is a place for you here."
        />
        <div className="grid md:grid-cols-3 gap-5">
          {[
            {
              icon: HandHelping,
              ne: 'मद्दत माग्नुहोस्',
              title: 'Ask for help',
              body: 'Share what you or your community needs. A moderator reviews it, then people nearby can offer support.',
              to: isAuthenticated ? '/create-post' : '/register',
              cta: 'Post a request',
              tone: 'bg-brand-tint text-brand',
            },
            {
              icon: HandHeart,
              ne: 'सहयोग गर्नुहोस्',
              title: 'Offer your time & skills',
              body: 'Browse open requests and activities — tutoring, clean-ups, relief drives — and join the ones that move you.',
              to: '/explore',
              cta: 'Browse requests',
              tone: 'bg-pine-tint text-pine',
            },
            donationsOn
              ? {
                  icon: HeartHandshake,
                  ne: 'योगदान दिनुहोस्',
                  title: 'Give to a cause',
                  body: 'Support verified campaigns with full expense ledgers, so you can see exactly where every rupee goes.',
                  to: '/donate',
                  cta: 'See campaigns',
                  tone: 'bg-marigold-tint text-marigold-text',
                }
              : {
                  icon: CalendarDays,
                  ne: 'कार्यक्रममा सहभागी हुनुहोस्',
                  title: 'Join an event',
                  body: 'Meet your neighbours at clean-ups, health camps and community gatherings near you.',
                  to: '/events',
                  cta: 'See events',
                  tone: 'bg-marigold-tint text-marigold-text',
                },
          ].map((w, i) => (
            <Reveal key={w.title} delay={i * 90}>
              <Tilt max={5} className="h-full rounded-[var(--radius-card)]">
                <Link to={w.to} className="group card card-hover h-full p-7 flex flex-col gap-5">
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${w.tone}`}>
                    <w.icon className="w-7 h-7" aria-hidden="true" />
                  </span>
                  <div className="space-y-2 flex-grow">
                    <p className="deva text-sm font-semibold text-muted">{w.ne}</p>
                    <h3 className="text-2xl font-bold text-ink">{w.title}</h3>
                    <p className="text-muted leading-relaxed">{w.body}</p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-ink group-hover:text-brand transition-colors">
                    {w.cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                </Link>
              </Tilt>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ IMPACT (real numbers) ============ */}
      <section className="bg-white border-y border-sand">
        <div className="container-page py-20 lg:py-24">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <Reveal className="lg:col-span-4 space-y-4">
              <span className="eyebrow deva">हाम्रो साझा प्रभाव</span>
              <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Small acts, adding up.</h2>
              <p className="text-muted leading-relaxed">
                These numbers are live from the platform — every member, activity and helper counted here is real.
              </p>
              {donationsOn && stats?.totalDonations > 0 && (
                <p className="text-sm text-ink-soft pt-2">
                  <strong className="font-display text-xl text-pine">{npr(stats.totalDonations)}</strong> given voluntarily so far, every rupee
                  tracked in a public ledger.
                </p>
              )}
            </Reveal>
            <div className="lg:col-span-8 grid grid-cols-2 gap-4">
              {impact.map((s, i) => (
                <Reveal key={s.label} delay={i * 80}>
                  <div className={`surface-sunken p-6 sm:p-7 h-full ${i === 0 ? 'sm:row-span-1' : ''}`}>
                    <s.icon className={`w-6 h-6 mb-4 ${s.tone}`} aria-hidden="true" />
                    <p className={`font-display font-bold text-4xl sm:text-5xl leading-none ${s.tone}`}>
                      <CountUp value={s.value} />
                    </p>
                    <p className="mt-3 text-sm font-semibold text-ink">{s.label}</p>
                    <p className="deva text-xs text-muted">{s.ne}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ OPEN REQUESTS ============ */}
      <section className="container-page py-20 lg:py-28">
        <SectionHeader
          eyebrow="अहिले सहयोग चाहिएको"
          title="People near you, asking for a hand"
          intro="Every request here has been reviewed by a moderator. Join one, or simply show you're interested."
          action={<ViewAll to="/explore">See all requests</ViewAll>}
        />
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((n) => (
              <div key={n} className="h-[26rem] rounded-[var(--radius-card)] bg-paper-deep animate-pulse" />
            ))}
          </div>
        ) : openRequests.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {openRequests.map((post, i) => (
              <Reveal key={post._id} delay={(i % 3) * 90}>
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="card p-12 text-center space-y-4">
            <p className="font-display text-2xl text-ink">No open requests right now.</p>
            <p className="text-muted">Be the first to start something in your community.</p>
            <Link to="/create-post" className="btn btn-primary">
              <Plus className="w-4 h-4" aria-hidden="true" /> Start a request
            </Link>
          </div>
        )}
      </section>

      {/* ============ CAMPAIGNS ============ */}
      {donationsOn && campaigns.length > 0 && (
        <section className="bg-pine text-white relative overflow-hidden">
          <div className="absolute inset-0 grain opacity-40" aria-hidden="true" />
          <div className="container-page relative py-20 lg:py-24">
            <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-10">
              <div className="max-w-2xl space-y-3">
                <span className="eyebrow deva !text-marigold">पारदर्शी अभियान</span>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">Campaigns you can see all the way through</h2>
                <p className="text-white/75 text-lg">Each campaign publishes its expenses, so supporters can follow exactly how funds are used.</p>
              </div>
              <Link to="/donate" className="group inline-flex items-center gap-1.5 font-semibold text-white hover:text-marigold transition-colors">
                All campaigns <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
            </Reveal>

            <div className="grid md:grid-cols-3 gap-5">
              {campaigns.map((c, i) => {
                const pct = c.goalAmount ? Math.min(100, Math.round((c.raisedAmount / c.goalAmount) * 100)) : 0;
                return (
                  <Reveal key={c._id} delay={i * 90}>
                    <Link to="/donate" className="group block h-full rounded-[var(--radius-card)] bg-white/[0.07] border border-white/15 p-6 hover:bg-white/[0.11] transition-colors">
                      <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                        <Avatar name={c.creator?.name} src={c.creator?.profilePicture} size="xs" />
                        <span className="truncate">{c.creator?.name}</span>
                      </div>
                      <h3 className="font-display text-xl font-semibold leading-snug mb-2 group-hover:text-marigold transition-colors">{c.title}</h3>
                      <p className="text-sm text-white/70 line-clamp-2 mb-6">{c.description}</p>
                      <div className="h-2 rounded-full bg-white/15 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Funds raised">
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-baseline justify-between mt-3 text-sm">
                        <span>
                          <strong className="font-display text-lg">{npr(c.raisedAmount)}</strong>
                          <span className="text-white/60"> of {npr(c.goalAmount)}</span>
                        </span>
                        <span className="text-marigold font-semibold">{pct}%</span>
                      </div>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ STORIES ============ */}
      {latestBlogs.length > 0 && (
        <section className="container-page py-20 lg:py-28">
          <SectionHeader
            eyebrow="समुदायका कथाहरू"
            title="Stories from the people doing the work"
            intro="Written by members and organisations about what they built together."
            action={<ViewAll to="/blogs">Read all stories</ViewAll>}
          />
          <div className="grid lg:grid-cols-12 gap-6">
            <Reveal className="lg:col-span-7">
              <Link to={`/blogs/${latestBlogs[0]._id}`} className="group relative block h-[420px] lg:h-full min-h-[420px] rounded-[1.75rem] overflow-hidden">
                <img
                  src={latestBlogs[0].coverImage || IMG.neighbours}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] ease-[var(--ease-out-soft)] group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9 text-white space-y-3">
                  <span className="chip bg-white/95 text-ink">{latestBlogs[0].category || 'Story'}</span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold leading-tight max-w-xl">{latestBlogs[0].title}</h3>
                  <p className="text-white/80 line-clamp-2 max-w-xl">{stripHtml(latestBlogs[0].content)}</p>
                  <span className="inline-flex items-center gap-2 text-sm pt-1">
                    <Avatar name={latestBlogs[0].author?.name} src={latestBlogs[0].author?.profilePicture} size="xs" />
                    {latestBlogs[0].author?.name}
                  </span>
                </div>
              </Link>
            </Reveal>
            <div className="lg:col-span-5 grid gap-6">
              {latestBlogs.slice(1).map((b, i) => (
                <Reveal key={b._id} delay={(i + 1) * 90}>
                  <Link to={`/blogs/${b._id}`} className="group card card-hover flex gap-5 p-4 h-full">
                    <img src={b.coverImage || IMG.children} alt="" loading="lazy" className="w-28 sm:w-36 aspect-square rounded-2xl object-cover shrink-0" />
                    <span className="flex flex-col justify-center gap-2 min-w-0">
                      <span className="text-xs font-semibold text-brand uppercase tracking-wider">{b.category || 'Story'}</span>
                      <span className="font-display text-lg font-semibold text-ink leading-snug line-clamp-2 group-hover:text-brand transition-colors">{b.title}</span>
                      <span className="text-sm text-muted line-clamp-2">{stripHtml(b.content)}</span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============ EVENTS ============ */}
      {upcomingEvents.length > 0 && (
        <section className="bg-paper-deep/60 border-y border-sand">
          <div className="container-page py-20 lg:py-24">
            <SectionHeader
              eyebrow="आगामी कार्यक्रम"
              title="Show up, meet your neighbours"
              action={<ViewAll to="/events">All events</ViewAll>}
            />
            <div className="grid gap-4">
              {upcomingEvents.map((ev, i) => {
                const d = new Date(ev.date);
                const capacity = ev.maxParticipants ? `${ev.joinedUsers?.length || 0} / ${ev.maxParticipants} going` : `${ev.joinedUsers?.length || 0} going`;
                return (
                  <Reveal key={ev._id} delay={i * 80}>
                    <Link to={`/events/${ev._id}`} className="group card card-hover flex flex-col sm:flex-row sm:items-center gap-5 p-5">
                      <span className="w-20 shrink-0 rounded-2xl bg-white border border-sand text-center py-2.5">
                        <span className="block text-xs font-bold uppercase tracking-wider text-brand">{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                        <span className="block font-display text-3xl font-bold text-ink leading-none mt-1">{d.getDate()}</span>
                      </span>
                      <span className="flex-1 min-w-0 space-y-1.5">
                        {ev.category && <span className="chip bg-sky-tint text-sky-ink">{ev.category}</span>}
                        <span className="block font-display text-xl font-semibold text-ink group-hover:text-brand transition-colors">{ev.title}</span>
                        <span className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                          {ev.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="w-4 h-4" aria-hidden="true" /> {ev.location}
                            </span>
                          )}
                          {ev.startTime && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="w-4 h-4" aria-hidden="true" /> {ev.startTime}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="flex items-center gap-4 shrink-0">
                        <span className="text-sm text-muted">{capacity}</span>
                        <span className="btn btn-primary btn-sm">View & join</span>
                      </span>
                    </Link>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ============ ORGANISATIONS + TRUST ============ */}
      <section className="container-page py-20 lg:py-28">
        <div className="grid lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <SectionHeader
              eyebrow="विश्वासमा आधारित"
              title="Built on trust, not on hope"
              intro="Helping is easier when you know who you're working with. These safeguards are part of every request, campaign and profile."
            />
            <ul className="space-y-5">
              {[
                { icon: ShieldCheck, title: 'Moderated before it goes live', body: 'Every help request and story is reviewed by a moderator first.' },
                { icon: BadgeCheck, title: 'Verified organisations', body: 'NGOs and groups are checked by the Hateymalo team before they get a verified badge.' },
                { icon: ReceiptText, title: 'Open expense ledgers', body: 'Campaigns publish what was spent and on what, for anyone to read.' },
                { icon: Flag, title: 'Report anything that feels wrong', body: 'Any post, comment or profile can be reported and is looked at by our team.' },
              ].map((t, i) => (
                <Reveal as="li" key={t.title} delay={i * 70} className="flex gap-4">
                  <span className="w-11 h-11 rounded-xl bg-pine-tint text-pine flex items-center justify-center shrink-0">
                    <t.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold text-ink">{t.title}</span>
                    <span className="block text-sm text-muted leading-relaxed">{t.body}</span>
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7">
            <Reveal className="flex items-center justify-between mb-6">
              <h3 className="font-display text-2xl font-bold text-ink flex items-center gap-2">
                <Building2 className="w-6 h-6 text-pine" aria-hidden="true" /> Organisations on Hateymalo
              </h3>
              <ViewAll to="/organizations">Directory</ViewAll>
            </Reveal>
            {organizations.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {organizations.map((org, i) => (
                  <Reveal key={org._id} delay={i * 80}>
                    <Link to={`/profile/${org._id}`} className="group card card-hover p-5 flex flex-col gap-3 h-full">
                      <span className="flex items-center gap-3">
                        <Avatar name={org.orgDetails?.orgName || org.name} src={org.profilePicture} size="lg" rounded="rounded-2xl" />
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink truncate group-hover:text-brand transition-colors">
                            {org.orgDetails?.orgName || org.name}
                          </span>
                          <span className="block text-xs text-muted">{org.orgDetails?.orgType || 'Organisation'}</span>
                        </span>
                      </span>
                      {(org.orgDetails?.description || org.bio) && (
                        <span className="text-sm text-muted line-clamp-2">{org.orgDetails?.description || org.bio}</span>
                      )}
                      <span className="mt-auto flex items-center justify-between text-xs text-muted">
                        {org.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {org.location}
                          </span>
                        )}
                        {org.isVerified && <VerificationBadge level="ORGANIZATION" isVerified />}
                      </span>
                    </Link>
                  </Reveal>
                ))}
                <Reveal delay={organizations.length * 80}>
                  <Link to="/register" className="group h-full min-h-[10rem] rounded-[var(--radius-card)] border-2 border-dashed border-sand hover:border-pine p-5 flex flex-col items-center justify-center text-center gap-2 transition-colors">
                    <Plus className="w-6 h-6 text-pine" aria-hidden="true" />
                    <span className="font-semibold text-ink">Run an NGO or community group?</span>
                    <span className="text-sm text-muted">Register your organisation — it's free.</span>
                  </Link>
                </Reveal>
              </div>
            ) : (
              <div className="card p-10 text-center space-y-3">
                <p className="text-ink font-semibold">No organisations have joined yet.</p>
                <Link to="/register" className="btn btn-pine btn-sm">Register your organisation</Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="container-page pb-20 lg:pb-28">
        <div className="max-w-3xl mx-auto">
          <SectionHeader eyebrow="प्रश्न र उत्तर" title="Questions people often ask" />
          <div className="divide-y divide-sand border-y border-sand">
            {faqs.map((item, idx) => {
              const open = activeFaq === idx;
              return (
                <div key={item.q}>
                  <h3 className="font-sans">
                    <button
                      type="button"
                      onClick={() => setActiveFaq(open ? -1 : idx)}
                      aria-expanded={open}
                      aria-controls={`faq-${idx}`}
                      className="w-full py-5 flex items-center justify-between gap-6 text-left text-lg font-semibold text-ink hover:text-brand transition-colors"
                    >
                      {item.q}
                      <span className={`w-9 h-9 rounded-full border border-sand flex items-center justify-center shrink-0 transition-colors ${open ? 'bg-ink text-white border-ink' : ''}`}>
                        {open ? <Minus className="w-4 h-4" aria-hidden="true" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`faq-${idx}`}
                    className={`grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out-soft)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-6 pr-12 text-muted leading-relaxed">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
