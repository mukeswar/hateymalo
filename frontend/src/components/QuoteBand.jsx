import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Quote, HeartHandshake, HandHeart, UserPlus, Plus, Pause, Play } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { CountUp, prefersReducedMotion } from './ui/motion';

// Real, correctly attributed quotes and traditional Nepali sayings only.
const QUOTES = [
  { ne: 'थोपा थोपा मिलेर सागर बन्छ।', en: 'Drop by drop, an ocean is made.', by: 'Nepali saying' },
  { ne: 'एकले थुकी सुकी, सयले थुकी नदी।', en: 'Alone, a drop dries up. Together, a hundred become a river.', by: 'Nepali proverb' },
  { en: 'How wonderful it is that nobody need wait a single moment before starting to improve the world.', by: 'Anne Frank' },
  { en: 'No one has ever become poor by giving.', by: 'Anne Frank' },
  { en: 'Alone we can do so little; together we can do so much.', by: 'Helen Keller' },
  { en: 'No act of kindness, no matter how small, is ever wasted.', by: 'Aesop' },
];

// Authentic, free-licensed photography from Nepal (Unsplash License), shown faded.
const BACKDROPS = [
  'https://images.unsplash.com/photo-1572109801525-0bb0272e8579?auto=format&fit=crop&w=1800&q=60',
  'https://images.unsplash.com/photo-1549819363-10acf530e110?auto=format&fit=crop&w=1800&q=60',
  'https://images.unsplash.com/photo-1763733595228-7d0a3e35dbad?auto=format&fit=crop&w=1800&q=60',
  'https://images.unsplash.com/photo-1763735135003-6710ca6872ea?auto=format&fit=crop&w=1800&q=60',
  'https://images.unsplash.com/photo-1511215579272-6192432f83bc?auto=format&fit=crop&w=1800&q=60',
  'https://images.unsplash.com/photo-1718179620334-b1d5056ed607?auto=format&fit=crop&w=1800&q=60',
];

const ROTATE_MS = 9000;

// Lightweight animated mark (instead of a heavy GIF): a heart with gentle pulse rings.
const PulseHeart = () => (
  <span className="relative inline-flex w-16 h-16 items-center justify-center" aria-hidden="true">
    <span className="absolute inset-0 rounded-full bg-brand/25 motion-safe:animate-ping [animation-duration:2.4s]" />
    <span className="absolute inset-2 rounded-full bg-brand/30 motion-safe:animate-ping [animation-duration:2.4s] [animation-delay:0.6s]" />
    <span className="relative w-14 h-14 rounded-full bg-white shadow-[var(--shadow-lift)] flex items-center justify-center">
      <img src="/logo-mark.png" alt="" className="w-9 h-9 object-contain" />
    </span>
  </span>
);

const QuoteBand = () => {
  const { isAuthenticated } = useAuth();
  const { settings } = useSettings();
  const donationsOn = settings?.allowPublicDonations !== false;

  // Random starting quote and photo for each page visit
  const start = useMemo(() => Math.floor(Math.random() * QUOTES.length), []);
  const backdrop = useMemo(() => BACKDROPS[Math.floor(Math.random() * BACKDROPS.length)], []);
  const [index, setIndex] = useState(start);
  const [paused, setPaused] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    API.get('/stats')
      .then((res) => res.data?.success && setStats(res.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (paused || prefersReducedMotion()) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % QUOTES.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [paused]);

  const q = QUOTES[index];

  return (
    <section aria-labelledby="quote-band-title" className="container-page mt-20 sm:mt-24">
      <div
        className="relative overflow-hidden rounded-[2rem] bg-night text-white"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        {/* Faded photographic backdrop */}
        <img src={backdrop} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-r from-night/92 via-night/75 to-night/55" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/40 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 grain opacity-30" aria-hidden="true" />

        <div className="relative grid lg:grid-cols-12 gap-10 p-8 sm:p-12 lg:p-16">
          {/* Rotating quote */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-8">
            <div className="flex items-center gap-4">
              <PulseHeart />
              <h2 id="quote-band-title" className="font-display text-xl font-semibold text-white/90 deva">
                हातेमालो — <span className="text-marigold">hand in hand</span>
              </h2>
            </div>

            <figure key={index} className="animate-in animate-rise space-y-4 min-h-[11rem]" aria-live="polite">
              <Quote className="w-10 h-10 text-marigold" aria-hidden="true" />
              <blockquote className="space-y-2">
                {q.ne && <p className="deva font-display text-2xl sm:text-3xl font-bold leading-snug">{q.ne}</p>}
                <p className={q.ne ? 'text-lg text-white/80' : 'font-display text-2xl sm:text-3xl font-bold leading-snug'}>
                  “{q.en}”
                </p>
              </blockquote>
              <figcaption className="text-sm font-semibold tracking-wide text-marigold">— {q.by}</figcaption>
            </figure>

            <div className="flex items-center gap-3">
              <div className="flex gap-1.5" role="tablist" aria-label="Choose a quote">
                {QUOTES.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`Quote ${i + 1} of ${QUOTES.length}`}
                    onClick={() => setIndex(i)}
                    className="p-1.5 -m-0.5"
                  >
                    <span className={`block h-1.5 rounded-full transition-all duration-500 ${i === index ? 'w-7 bg-marigold' : 'w-1.5 bg-white/35 hover:bg-white/60'}`} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? 'Resume quotes' : 'Pause quotes'}
                className="w-9 h-9 rounded-full border border-white/25 flex items-center justify-center text-white/80 hover:bg-white/10"
              >
                {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Ways to take part */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {stats && (
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/[0.08] border border-white/15 p-4">
                  <p className="font-display text-3xl font-bold leading-none"><CountUp value={stats.totalMembers} /></p>
                  <p className="text-xs text-white/70 mt-2">members already here</p>
                </div>
                <div className="rounded-2xl bg-white/[0.08] border border-white/15 p-4">
                  <p className="font-display text-3xl font-bold leading-none"><CountUp value={stats.peopleConnected} /></p>
                  <p className="text-xs text-white/70 mt-2">helping hands joined a drive</p>
                </div>
              </div>
            )}

            <p className="text-white/80 leading-relaxed">
              Every big change here started with one small step. Pick the one that feels right for you today.
            </p>

            <div className="grid gap-3">
              {donationsOn && (
                <Link to="/donate" className="group flex items-center gap-4 rounded-2xl bg-white text-ink p-4 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] transition-all">
                  <span className="w-11 h-11 rounded-xl bg-pine-tint text-pine flex items-center justify-center shrink-0">
                    <HeartHandshake className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-semibold">Donate to a cause</span>
                    <span className="block text-sm text-muted">Any amount, with an open expense ledger</span>
                  </span>
                </Link>
              )}
              <Link to="/explore" className="group flex items-center gap-4 rounded-2xl bg-white/[0.08] border border-white/15 p-4 hover:bg-white/[0.14] transition-colors">
                <span className="w-11 h-11 rounded-xl bg-white/15 text-white flex items-center justify-center shrink-0">
                  <HandHeart className="w-5 h-5" aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold">Contribute your time or skills</span>
                  <span className="block text-sm text-white/70">Join a request or community drive near you</span>
                </span>
              </Link>
              {isAuthenticated ? (
                <Link to="/create-post" className="btn btn-primary btn-lg">
                  <Plus className="w-5 h-5" aria-hidden="true" /> Start something in your community
                </Link>
              ) : (
                <Link to="/register" className="btn btn-primary btn-lg">
                  <UserPlus className="w-5 h-5" aria-hidden="true" /> Become a member — it's free
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuoteBand;
