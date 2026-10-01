import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, Heart, ShieldCheck, Mail, MapPin, Facebook, Youtube, Instagram, Twitter } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-slate-200 text-slate-600 pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <img src="/logo.png" alt="हातेमालो (HAATEMALO)" className="h-14 w-auto object-contain" />
            </Link>

            <p className="text-base font-extrabold text-[#C8382C]">
              "मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।"
            </p>

            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              Nepal's official non-profit community platform where citizens, volunteers, and NGOs collaborate for emergency aid, tree plantation, student tutoring, and civic initiatives.
            </p>

            <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
              <MapPin className="w-4 h-4 text-[#C8382C]" /> Kathmandu, Nepal • <ShieldCheck className="w-4 h-4 text-emerald-600" /> 100% Voluntary & Transparent
            </div>

            {/* SOCIAL MEDIA LINKS */}
            <div className="pt-3 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Join us on social media</p>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Join us on Facebook"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#1877F2] text-slate-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs hover:scale-110"
                >
                  <Facebook className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Subscribe on YouTube"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#FF0000] text-slate-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs hover:scale-110"
                >
                  <Youtube className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow us on Instagram"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-[#E4405F] text-slate-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs hover:scale-110"
                >
                  <Instagram className="w-4.5 h-4.5" />
                </a>
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Follow us on X (Twitter)"
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-black text-slate-600 hover:text-white flex items-center justify-center transition-all duration-300 shadow-2xs hover:scale-110"
                >
                  <Twitter className="w-4.5 h-4.5" />
                </a>
              </div>
            </div>

          </div>

          {/* Column 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Platform</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/explore" className="hover:text-[#C8382C] transition-colors">Explore Initiatives</Link></li>
              <li><Link to="/categories" className="hover:text-[#C8382C] transition-colors">Activities Directory</Link></li>
              <li><Link to="/events" className="hover:text-[#C8382C] transition-colors">Official Events</Link></li>
              <li><Link to="/blogs" className="hover:text-[#C8382C] transition-colors">Community Stories</Link></li>
            </ul>
          </div>

          {/* Column 2: Community */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Community</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/members" className="hover:text-[#C8382C] transition-colors">Active Members</Link></li>
              <li><Link to="/organizations" className="hover:text-[#C8382C] transition-colors">NGOs & Partner Groups</Link></li>
              <li><Link to="/create-post" className="hover:text-[#C8382C] transition-colors">Post Your Request</Link></li>
              <li><Link to="/search" className="hover:text-[#C8382C] transition-colors">Universal Search</Link></li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-xs">
              <li><Link to="/donate" className="text-amber-700 font-semibold hover:underline">Voluntary Platform Donation</Link></li>
              <li><Link to="/about" className="hover:text-[#C8382C] transition-colors">About HAATEMALO</Link></li>
              <li><a href="mailto:support@haatemalo.org" className="hover:text-[#C8382C] transition-colors flex items-center gap-1"><Mail className="w-3 h-3 text-[#C8382C]" /> Contact Support</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} HAATEMALO (हातेमालो). Built for community collaboration in Nepal.</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-slate-700">Community Guidelines</Link>
            <Link to="/about" className="hover:text-slate-700">Privacy & Safety</Link>
            <Link to="/donate" className="hover:text-amber-700 flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Support Us</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
