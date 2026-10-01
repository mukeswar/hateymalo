import React, { useState, useEffect } from 'react';
import API from '../services/api';
import DonationModal from '../components/DonationModal';
import {
  Heart,
  ShieldCheck,
  Sparkles,
  Wallet,
  CheckCircle2,
  Users,
  TreePine,
  GraduationCap,
  Globe,
  Award,
  ArrowRight,
  Quote,
  Receipt,
  PhoneCall,
  QrCode,
  Copy,
  Check,
} from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Aarav Shrestha',
    location: 'Lalitpur',
    role: 'Regular Volunteer Donor',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    text: 'Supporting HAATEMALO gives me total peace of mind. Knowing my small monthly contribution keeps SMS alerts active for emergency help requests across the valley is deeply fulfilling.',
  },
  {
    name: 'Saraswati Gurung',
    location: 'Pokhara',
    role: 'Community Educator',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
    text: 'When we organized our rural tutoring drive, HAATEMALO provided the platform for free. Donating back to cover server costs is the least we can do for our youth.',
  },
  {
    name: 'Bikram Thapa',
    location: 'Kathmandu',
    role: 'Environment Campaign Lead',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    text: '100% financial transparency! Every rupee donated to campaigns is backed by uploaded receipts and photo evidence. That is true trust.',
  },
];

const Donate = () => {
  const [showModal, setShowModal] = useState(false);
  const [settings, setSettings] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await API.get('/settings');
        if (res.data.success) {
          setSettings(res.data.data);
        }
      } catch (error) {
        console.error('Failed to load platform settings:', error);
      }
    };
    fetchSettings();
  }, []);

  const qrImageUrl = settings?.paymentQrCode || 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HAATEMALO-DONATION-OFFICIAL-QR';
  const qrInstructions = settings?.paymentInstructions || 'Scan with eSewa, Khalti, or Fonepay to make a direct voluntary contribution.';
  const qrPhone = settings?.paymentPhone || '+977 9800000000';

  const copyPhoneToClipboard = () => {
    navigator.clipboard.writeText(qrPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2500);
  };

  const donationsDisabled = settings && settings.allowPublicDonations === false;

  if (donationsDisabled) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 mx-auto">
          <Heart className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">Donations Temporarily Paused</h1>
        <p className="text-sm text-slate-600">
          Voluntary contributions are currently disabled by the platform administrators. Please check back soon — thank you for your generosity and support.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      
      {/* Hero Banner with Side Static QR Code */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
        
        {/* Left 2 Cols: Inspiring Hero Text */}
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-[#94201B] via-[#C8382C] to-[#E05244] text-white p-8 sm:p-12 shadow-2xl space-y-6 border border-rose-400/20 relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-xs font-extrabold uppercase tracking-widest border border-white/20">
              <Heart className="w-4 h-4 fill-amber-300 text-amber-300" /> 100% Voluntary Community Aid
            </div>

            <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight text-white">
              हातेमालो — जहाँ हरेक सानो सहयोगले ठूलो मुस्कान ल्याउँछ
            </h1>

            <p className="text-base sm:text-lg text-rose-100 font-medium leading-relaxed">
              Every contribution directly empowers Nepali citizens to request emergency help, plant trees, tutor underprivileged children, and keep community campaigns completely free for everyone.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                onClick={() => setShowModal(true)}
                className="px-8 py-4 rounded-2xl font-bold bg-white text-[#94201B] hover:bg-slate-100 shadow-xl transition-all hover:scale-105 text-sm sm:text-base flex items-center gap-2"
              >
                💚 Make a Voluntary Contribution <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href="#transparency"
                className="px-6 py-4 rounded-2xl font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all text-sm flex items-center gap-2"
              >
                <ShieldCheck className="w-5 h-5 text-amber-300" /> Audit Transparency Guarantee
              </a>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Static Payment QR Code Side Card */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-xl space-y-5 text-center relative flex flex-col justify-between h-full">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-200">
              <QrCode className="w-3.5 h-3.5" /> Official Static QR Code
            </div>
            <h3 className="text-lg font-black text-slate-900">Direct Scan & Pay</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{qrInstructions}</p>
          </div>

          {/* QR Code Image Container */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-[220px] mx-auto shadow-inner space-y-2">
            <img
              src={qrImageUrl}
              alt="HAATEMALO Official Donation QR"
              className="w-full h-auto rounded-xl object-contain mx-auto border border-slate-200"
            />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">eSewa • Khalti • Fonepay</span>
          </div>

          {/* Wallet Phone Quick Copy */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between gap-2">
            <div className="text-left">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Official Wallet ID / Mobile</span>
              <span className="font-mono font-bold text-slate-900">{qrPhone}</span>
            </div>
            <button
              onClick={copyPhoneToClipboard}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shrink-0"
              title="Copy Phone Number"
            >
              {copiedPhone ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 px-4 rounded-2xl font-bold bg-[#C8382C] text-white hover:bg-[#b02e23] shadow-md transition-all text-xs flex items-center justify-center gap-1.5"
          >
            Submit Donation Receipt <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Impact Numbers Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center mx-auto mb-2 border border-rose-100">
            <Heart className="w-5 h-5 fill-[#C8382C]" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">NPR 1.25L+</p>
          <p className="text-xs text-slate-500 font-semibold uppercase">Platform & Campaign Aid Logged</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-2 border border-teal-100">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">450+</p>
          <p className="text-xs text-slate-500 font-semibold uppercase">Active Volunteers Across Nepal</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
            <TreePine className="w-5 h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">120+</p>
          <p className="text-xs text-slate-500 font-semibold uppercase">Cleanups & Plantation Drives</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md text-center space-y-1">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto mb-2 border border-sky-100">
            <GraduationCap className="w-5 h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">300+</p>
          <p className="text-xs text-slate-500 font-semibold uppercase">Students Mentored & Taught</p>
        </div>
      </div>

      {/* Where Your Money Goes - Interactive Cards */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-[#C8382C]">Direct Tangible Impact</span>
          <h2 className="text-3xl font-extrabold text-slate-900">How Your Support Changes Lives</h2>
          <p className="text-sm text-slate-600">
            HAATEMALO operates with zero mandatory subscription fees. Your voluntary support is allocated directly to platform operations and volunteer logistics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-4 hover:border-teal-400 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
              <Globe className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">100% Free Public Platform</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Covers cloud server infrastructure, database hosting, and high-availability uptime so any citizen can post emergency help requests 24/7 without barrier.
            </p>
            <div className="pt-2 text-xs font-bold text-teal-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-teal-600" /> Always Free for Citizens
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-4 hover:border-rose-400 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-[#C8382C] flex items-center justify-center border border-rose-200">
              <PhoneCall className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">SMS & Emergency Alerts</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Funds instant SMS alert dispatches to nearby verified volunteers when critical blood requests, flood relief, or urgent community assistance is needed.
            </p>
            <div className="pt-2 text-xs font-bold text-[#C8382C] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-[#C8382C]" /> Real-time Alert System
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-md space-y-4 hover:border-emerald-400 transition-all">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <TreePine className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">Volunteer Drive Supplies</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Purchases sanitation gloves, biodegradable waste bags, tree saplings, and educational stationery distributed to active community campaign leaders.
            </p>
            <div className="pt-2 text-xs font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Direct Campaign Equipment
            </div>
          </div>

        </div>
      </div>

      {/* Financial Transparency & Ledger Guarantee */}
      <div id="transparency" className="bg-slate-900 text-white p-8 sm:p-12 rounded-3xl shadow-xl space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              <Receipt className="w-4 h-4 text-emerald-400" /> Open Book Audit Policy
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Strict Financial Integrity Guarantee</h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every single rupee contributed to campaigns or platform support is recorded on an itemized ledger. Campaign expenses require uploaded receipt images and administrator verification before funds are disbursed.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3.5 rounded-2xl font-bold bg-[#C8382C] hover:bg-[#b02e23] text-white shadow-xl transition-all shrink-0 text-sm flex items-center gap-2"
          >
            Donate with Transparency <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-800 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Public itemized expense reports
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Automated digital receipt issuance
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> eSewa, Khalti & Fonepay verified gateways
          </div>
        </div>
      </div>

      {/* Community Testimonials - Why We Give */}
      <div className="space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-teal-700">Community Voices</span>
          <h2 className="text-3xl font-extrabold text-slate-900">Why Supporters Choose HAATEMALO</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <Quote className="w-8 h-8 text-[#C8382C]/30" />
                <p className="text-xs text-slate-700 leading-relaxed italic">"{t.text}"</p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <img src={t.image} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-slate-200" />
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">{t.name}</h4>
                  <p className="text-[10px] text-slate-500">{t.role} • {t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final Call to Action Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-8 sm:p-10 rounded-3xl shadow-xl text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-extrabold">Ready to Join Hands for a Better Nepal?</h2>
        <p className="text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto">
          Your support—big or small—makes a real, visible difference in local communities today.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="px-8 py-4 rounded-2xl font-bold bg-white text-emerald-900 hover:bg-slate-100 shadow-xl transition-all text-base inline-flex items-center gap-2 hover:scale-105"
        >
          💚 Make Your Contribution Now
        </button>
      </div>

      {/* Donation Modal */}
      <DonationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />

    </div>
  );
};

export default Donate;
