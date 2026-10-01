import React from 'react';
import { CheckCircle2, ShieldCheck, Building2, ShieldAlert, Award } from 'lucide-react';

const VerificationBadge = ({ level = 'MEMBER', isVerified = false, showLabel = true }) => {
  if (!isVerified && (!level || level === 'NEW MEMBER' || level === 'MEMBER')) {
    return null;
  }

  // Base styling for Light Theme
  let colorClasses = 'bg-sky-50 text-sky-800 border-sky-300';
  let IconComponent = CheckCircle2;
  let displayLabel = level;

  if (isVerified) {
    colorClasses = 'bg-sky-100 text-sky-900 border-sky-400 shadow-2xs';
    IconComponent = CheckCircle2;
    displayLabel = level === 'ORGANIZATION' ? 'VERIFIED NGO ✓' : 'VERIFIED ✓';
  } else if (level === 'ORGANIZATION') {
    colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300';
    IconComponent = Building2;
    displayLabel = 'NGO / ORG';
  } else if (level === 'VOLUNTEER') {
    colorClasses = 'bg-teal-50 text-teal-800 border-teal-300';
    IconComponent = ShieldCheck;
    displayLabel = 'VOLUNTEER 🤝';
  } else if (level === 'SENIOR_VOLUNTEER') {
    colorClasses = 'bg-purple-50 text-purple-800 border-purple-300';
    IconComponent = Award;
    displayLabel = 'SENIOR VOLUNTEER ⭐';
  } else if (level === 'COMMUNITY_LEAD') {
    colorClasses = 'bg-amber-50 text-amber-900 border-amber-300';
    IconComponent = ShieldCheck;
    displayLabel = 'COMMUNITY LEAD 👑';
  } else if (level === 'ADMIN' || level === 'SUPER_ADMIN') {
    colorClasses = 'bg-rose-50 text-[#C8382C] border-rose-300';
    IconComponent = ShieldAlert;
    displayLabel = 'ADMIN 🛡️';
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border transition-all ${colorClasses}`}
      title={isVerified ? 'Super Admin Verified Account' : level}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      {showLabel && <span>{displayLabel}</span>}
    </span>
  );
};

export default VerificationBadge;
