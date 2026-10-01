import React from 'react';
import { Link } from 'react-router-dom';
import { HeartHandshake, ShieldCheck, Users, Heart, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <img src="/logo.png" alt="हातेमालो (HAATEMALO)" className="h-24 mx-auto w-auto object-contain" />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900">
          About <span className="text-[#C8382C]">HAATEMALO (हातेमालो)</span>
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-teal-800">
          "मद्दत मागौँ। सहयोग गरौँ। सँगै परिवर्तन ल्याऔँ।"
        </p>
        <p className="text-base text-slate-600 leading-relaxed">
          HAATEMALO ("Joining Hands" in Nepali) is a dedicated digital platform built to foster community solidarity, mutual assistance, civic responsibility, and volunteer collaboration across Nepal.
        </p>
      </div>

      {/* 3 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
            <Heart className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">मद्दत मागौँ (Request Help)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Anyone facing emergency hardship, needing academic guidance, seeking tutoring, or organizing local aid can request community support safely.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center mx-auto border border-sky-200">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">सहयोग गरौँ (Lend a Hand)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Volunteers and skilled citizens step forward to offer mentorship, donate time, plant saplings, or participate in street sanitation drives.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-md space-y-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto border border-amber-200">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">सँगै परिवर्तन ल्याऔँ (Drive Change)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            By connecting local citizens with shared goals, we build cleaner neighborhoods, empower students, and nurture a culture of empathy.
          </p>
        </div>
      </div>

      {/* Community Safety & Moderation */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-md space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-teal-700 shrink-0" />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Strict Admin Approval & Safety Guarantee</h2>
            <p className="text-xs text-slate-500">Protecting user trust and maintaining focus on genuine community aid</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Every post submitted on HAATEMALO undergoes strict administrative review before being published publicly. Posts containing commercial advertising, spam, or harmful content are rejected with transparent feedback, ensuring that all public opportunities remain 100% genuine and community-focused.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Transparent rejection reasons for users
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dedicated volunteer member profiles
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Real-time activity joining counters
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Role-based authorization & JWT protection
          </div>
        </div>
      </div>

      {/* Call to action */}
      <div className="text-center space-y-4 pt-4">
        <h3 className="text-2xl font-extrabold text-slate-900">Join the HAATEMALO Movement</h3>
        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-2xl font-bold bg-teal-600 text-white text-sm shadow-md hover:bg-teal-700 transition-all flex items-center gap-1.5"
          >
            Register Account <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/explore"
            className="px-6 py-3 rounded-2xl font-semibold bg-slate-100 text-slate-800 text-sm border border-slate-200 hover:bg-slate-200 transition-all"
          >
            Explore Public Posts
          </Link>
        </div>
      </div>

    </div>
  );
};

export default About;
