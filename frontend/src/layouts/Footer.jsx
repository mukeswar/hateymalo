import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, ShieldCheck, Heart, ArrowUpRight } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const COLUMNS = [
  {
    title: 'Get involved',
    links: [
      { to: '/explore', label: 'Help requests' },
      { to: '/categories', label: 'Causes' },
      { to: '/events', label: 'Events' },
      { to: '/create-post', label: 'Ask or offer help' },
    ],
  },
  {
    title: 'Community',
    links: [
      { to: '/blogs', label: 'Stories' },
      { to: '/organizations', label: 'Organizations' },
      { to: '/members', label: 'Members' },
      { to: '/search', label: 'Search' },
    ],
  },
  {
    title: 'About',
    links: [
      { to: '/about', label: 'Our mission' },
      { to: '/about#guidelines', label: 'Community guidelines' },
      { to: '/donate', label: 'Transparency', requiresDonations: true },
    ],
  },
];

const Footer = () => {
  const { settings } = useSettings();
  const donationsOn = settings?.allowPublicDonations !== false;
  const email = settings?.contactEmail || 'support@hateymalo.com';

  return (
    <footer className="relative bg-night text-[#D9D0C4] mt-24 overflow-hidden">
      {/* Decorative hand-in-hand mark */}
      <img
        src="/logo-mark.png"
        alt=""
        aria-hidden="true"
        className="absolute -right-16 -bottom-20 w-80 opacity-[0.05] pointer-events-none select-none"
      />

      <div className="container-page relative pt-16 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5 space-y-5">
            <Link to="/" className="inline-flex items-center gap-3 rounded-xl" aria-label="Hateymalo home">
              <span className="w-12 h-12 rounded-2xl bg-white/95 flex items-center justify-center">
                <img src="/logo-mark.png" alt="" className="w-9 h-9 object-contain" />
              </span>
              <span className="font-display text-3xl font-bold text-white leading-none">हातेमालो</span>
            </Link>

            <p className="font-display text-xl text-white/90 leading-snug deva max-w-md">
              {settings?.tagline || 'मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।'}
            </p>
            <p className="text-sm leading-relaxed max-w-md text-[#B5AB9E]">
              A free community platform where people across Nepal ask for help, offer their time and skills, and
              organise around the causes they care about — hand in hand.
            </p>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#B5AB9E]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-marigold" aria-hidden="true" /> Nepal
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#7BC0A6]" aria-hidden="true" /> Every post reviewed by moderators
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="font-sans text-xs font-bold uppercase tracking-[0.16em] text-white/60 mb-4">{col.title}</h2>
                <ul className="space-y-2.5">
                  {col.links
                    .filter((l) => !l.requiresDonations || donationsOn)
                    .map((l) => (
                      <li key={l.label}>
                        <Link to={l.to} className="text-sm text-[#D9D0C4] hover:text-white transition-colors">
                          {l.label}
                        </Link>
                      </li>
                    ))}
                </ul>
              </div>
            ))}

            <div className="col-span-2 sm:col-span-3 card !bg-white/5 !border-white/10 !shadow-none p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold">Questions, partnerships or a safety concern?</p>
                <p className="text-sm text-[#B5AB9E]">We read every message.</p>
              </div>
              <a href={`mailto:${email}`} className="btn btn-light btn-sm self-start sm:self-auto">
                <Mail className="w-4 h-4" aria-hidden="true" /> {email}
              </a>
            </div>
          </div>
        </div>

        <div className="mt-14 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm text-[#9C9286]">
          <p>© {new Date().getFullYear()} Hateymalo (हातेमालो). Built for community collaboration in Nepal.</p>
          {donationsOn && (
            <Link to="/donate" className="inline-flex items-center gap-1.5 hover:text-white transition-colors">
              <Heart className="w-4 h-4 text-brand fill-brand" aria-hidden="true" /> Support the platform
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
