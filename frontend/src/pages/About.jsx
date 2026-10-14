import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import API from '../services/api';
import { Reveal, CountUp } from '../components/ui/motion';
import {
  HeartHandshake,
  HandHelping,
  Users,
  Sprout,
  ShieldCheck,
  ReceiptText,
  MapPin,
  Sparkles,
  CheckCircle2,
  XCircle,
  Flag,
  ArrowRight,
  Eye,
} from 'lucide-react';

const PILLARS = [
  {
    icon: HandHelping,
    ne: 'मद्दत मागौँ',
    en: 'Ask for help',
    body: 'Anyone facing hardship, needing guidance or tutoring, or organising local aid can ask the community, safely and without fees.',
    tone: 'bg-brand-tint text-brand',
  },
  {
    icon: Users,
    ne: 'सहयोग गरौँ',
    en: 'Lend a hand',
    body: 'Neighbours and volunteers offer time and skills: mentoring, planting saplings, cleaning streets, showing up when it counts.',
    tone: 'bg-pine-tint text-pine',
  },
  {
    icon: Sprout,
    ne: 'सँगै परिवर्तन ल्याऔँ',
    en: 'Change things together',
    body: 'Small acts add up to cleaner neighbourhoods, supported students and a stronger habit of looking out for each other.',
    tone: 'bg-marigold-tint text-marigold-text',
  },
];

const VALUES = [
  { icon: HeartHandshake, title: 'Dignity first', body: 'Asking for help is not a weakness. Requests are written and shown with respect, never as spectacle.' },
  { icon: ReceiptText, title: 'Open books', body: 'Campaigns publish their expenses with receipts so supporters can see exactly where money went.' },
  { icon: ShieldCheck, title: 'Safety by design', body: 'Posts are reviewed before they go public, and anyone can report something that feels wrong.' },
  { icon: MapPin, title: 'Locally led', body: 'The people closest to a problem usually know best how to solve it. We give them the tools.' },
];

const DO = [
  'Describe needs honestly and specifically, including where and when.',
  'Be kind in comments, even when you disagree.',
  'Protect privacy: ask before sharing anyone else\'s photo or details.',
  'Keep campaign spending documented with receipts.',
  'Meet in public places and tell someone where you are going.',
];

const DONT = [
  'Advertise products or services, or post spam.',
  'Ask for money outside the platform\'s published channels.',
  'Share hateful, harassing or misleading content.',
  'Post someone\'s phone number, address or ID without consent.',
  'Impersonate a person or organisation.',
];

const STAT_ITEMS = [
  { key: 'totalMembers', label: 'Members' },
  { key: 'totalActivities', label: 'Community activities' },
  { key: 'peopleConnected', label: 'Times people joined in' },
  { key: 'communitiesReached', label: 'Places reached' },
];

const About = () => {
  const [stats, setStats] = useState(null);
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    API.get('/stats')
      .then((res) => {
        if (alive && res.data?.success) setStats(res.data.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Support deep links such as /about#guidelines.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [location.hash]);

  return (
    <div className="pb-20">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden border-b border-sand bg-paper-deep/60">
        <div className="absolute inset-0 grain opacity-60" aria-hidden="true" />
        <div className="container-page relative pt-12 sm:pt-16 pb-14 sm:pb-20 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-5 animate-rise">
            <span className="eyebrow">Our mission</span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.05]">
              <span className="deva block text-brand">हातेमालो</span>
              means hand in hand.
            </h1>
            <p className="text-muted text-lg sm:text-xl leading-relaxed max-w-2xl">
              It is the old way of getting things done in Nepal: neighbours joining hands to raise a roof, carry a load up the hill, or see a family through a hard season. Hateymalo brings that same habit online, so help can find the people who need it.
            </p>
            <p className="deva text-xl sm:text-2xl font-display font-semibold text-pine">
              मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।
            </p>
          </div>
          <div className="lg:col-span-5 flex justify-center animate-rise">
            <div className="card p-10 sm:p-12 !rounded-[2rem] shadow-[var(--shadow-lift)]">
              <img src="/logo.png" alt="Hateymalo (हातेमालो) logo" className="h-32 sm:h-40 w-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ============ STORY ============ */}
      <section className="container-page py-16 sm:py-20">
        <div className="grid lg:grid-cols-12 gap-10">
          <Reveal className="lg:col-span-5 space-y-3">
            <span className="eyebrow deva">हाम्रो कथा</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Why we built it</h2>
          </Reveal>
          <Reveal delay={80} className="lg:col-span-7 space-y-5 text-lg text-ink-soft leading-relaxed">
            <p>
              Most people want to help. What usually stops them is not a lack of kindness but a lack of a clear, trustworthy place to start: who needs what, where, and whether it is genuine.
            </p>
            <p>
              Hateymalo is that place. Someone posts a need. It is reviewed so it stays genuine. People nearby can join in, offer a skill, or support a campaign whose every expense is published. Nobody pays to ask for help.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ============ REAL NUMBERS ============ */}
      {stats && (
        <section className="container-page pb-16 sm:pb-20" aria-label="Community so far">
          <Reveal className="card p-6 sm:p-8">
            <p className="text-sm text-muted mb-5">The community so far, counted live from the platform:</p>
            <dl className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {STAT_ITEMS.map(({ key, label }) => (
                <div key={key}>
                  <dd className="font-display text-3xl sm:text-4xl font-bold text-ink">
                    <CountUp value={stats[key] ?? 0} />
                  </dd>
                  <dt className="text-sm text-muted mt-1">{label}</dt>
                </div>
              ))}
            </dl>
          </Reveal>
        </section>
      )}

      {/* ============ HOW IT WORKS ============ */}
      <section className="bg-white border-y border-sand">
        <div className="container-page py-16 sm:py-20">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <span className="eyebrow deva">कसरी काम गर्छ</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">How it works</h2>
          </Reveal>
          <div className="grid md:grid-cols-3 gap-6">
            {PILLARS.map(({ icon: Icon, ne, en, body, tone }, i) => (
              <Reveal key={en} delay={i * 80}>
                <div className="surface-sunken h-full p-6 sm:p-7 space-y-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tone}`}>
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-xl font-semibold text-ink leading-snug">
                    <span className="deva block">{ne}</span>
                    <span className="text-base font-sans font-semibold text-muted">{en}</span>
                  </h3>
                  <p className="text-ink-soft leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ VALUES ============ */}
      <section className="container-page py-16 sm:py-20">
        <Reveal className="max-w-2xl space-y-3 mb-10">
          <span className="eyebrow deva">हाम्रा मूल्यहरू</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">What we hold on to</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {VALUES.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 70}>
              <div className="card card-hover h-full p-6 space-y-3">
                <Icon className="w-7 h-7 text-pine" aria-hidden="true" />
                <h3 className="text-lg font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============ GUIDELINES ============ */}
      <section id="guidelines" className="scroll-mt-24 bg-white border-y border-sand">
        <div className="container-page py-16 sm:py-20">
          <Reveal className="max-w-2xl space-y-3 mb-10">
            <span className="eyebrow deva">सामुदायिक नियम</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-ink leading-tight">Community guidelines</h2>
            <p className="text-muted text-lg">
              A few simple agreements keep Hateymalo safe and genuine for everyone. By posting or joining, you agree to them.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-6">
            <Reveal className="rounded-[var(--radius-card)] border border-sand p-6 sm:p-7">
              <h3 className="text-lg font-semibold text-pine flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5" aria-hidden="true" /> Please do
              </h3>
              <ul className="space-y-3">
                {DO.map((t) => (
                  <li key={t} className="flex gap-3 text-ink-soft">
                    <CheckCircle2 className="w-4 h-4 text-pine mt-1.5 shrink-0" aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal delay={80} className="rounded-[var(--radius-card)] border border-sand p-6 sm:p-7">
              <h3 className="text-lg font-semibold text-brand flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5" aria-hidden="true" /> Please don't
              </h3>
              <ul className="space-y-3">
                {DONT.map((t) => (
                  <li key={t} className="flex gap-3 text-ink-soft">
                    <XCircle className="w-4 h-4 text-brand mt-1.5 shrink-0" aria-hidden="true" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {[
              { icon: Eye, title: 'Every post is reviewed', body: 'Posts are checked by moderators before they appear publicly. If one is declined, the author is told why.' },
              { icon: Flag, title: 'Report what feels wrong', body: 'Use the report option on any post or comment. Reports go straight to the moderation team.' },
              { icon: Sparkles, title: 'Second chances, firm limits', body: 'Most issues are solved with a note. Repeated or serious harm leads to removal from the platform.' },
            ].map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 70} className="surface-sunken p-6 space-y-2">
                <Icon className="w-6 h-6 text-sky-ink" aria-hidden="true" />
                <h3 className="font-semibold text-ink">{title}</h3>
                <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="container-page pt-16 sm:pt-20">
        <Reveal className="rounded-[var(--radius-card)] bg-night text-white relative overflow-hidden p-8 sm:p-12 text-center">
          <div className="absolute inset-0 grain opacity-30" aria-hidden="true" />
          <div className="relative space-y-4 max-w-xl mx-auto">
            <span className="eyebrow deva !text-marigold justify-center">हातेमालो</span>
            <h2 className="text-3xl sm:text-4xl font-bold">Join hands with us</h2>
            <p className="text-white/80">Create an account to ask for help or offer it, or simply look around first.</p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link to="/register" className="btn btn-primary">
                Create an account <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
              <Link to="/explore" className="btn btn-light">Explore help requests</Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
};

export default About;
