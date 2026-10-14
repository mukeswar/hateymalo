import React from 'react';
import { BadgeCheck, ShieldCheck, Building2, ShieldAlert, Award, Crown, HandHeart } from 'lucide-react';

const PINE = 'bg-pine-tint text-pine border-pine/20';
const MARIGOLD = 'bg-marigold-tint text-marigold-text border-marigold/40';
const BRAND = 'bg-brand-tint text-brand border-brand/20';

const humanize = (s = '') =>
  String(s)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());

const VerificationBadge = ({ level = 'MEMBER', isVerified = false, showLabel = true }) => {
  if (!isVerified && (!level || level === 'NEW MEMBER' || level === 'MEMBER')) {
    return null;
  }

  let colorClasses = MARIGOLD;
  let IconComponent = Award;
  let displayLabel = humanize(level);

  if (isVerified) {
    colorClasses = PINE;
    IconComponent = BadgeCheck;
    displayLabel = level === 'ORGANIZATION' ? 'Verified organisation' : 'Verified';
  } else if (level === 'ORGANIZATION') {
    colorClasses = MARIGOLD;
    IconComponent = Building2;
    displayLabel = 'Organisation';
  } else if (level === 'VOLUNTEER') {
    colorClasses = MARIGOLD;
    IconComponent = HandHeart;
    displayLabel = 'Volunteer';
  } else if (level === 'SENIOR_VOLUNTEER') {
    colorClasses = MARIGOLD;
    IconComponent = Award;
    displayLabel = 'Senior volunteer';
  } else if (level === 'COMMUNITY_LEAD') {
    colorClasses = MARIGOLD;
    IconComponent = Crown;
    displayLabel = 'Community lead';
  } else if (level === 'ADMIN' || level === 'SUPER_ADMIN') {
    colorClasses = BRAND;
    IconComponent = ShieldAlert;
    displayLabel = level === 'SUPER_ADMIN' ? 'Super admin' : 'Admin';
  } else if (level === 'MODERATOR') {
    colorClasses = BRAND;
    IconComponent = ShieldCheck;
    displayLabel = 'Moderator';
  }

  const title = isVerified ? 'Verified by the Hateymalo team' : displayLabel;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border align-middle font-semibold leading-none whitespace-nowrap ${
        showLabel ? 'px-2 py-1 text-xs' : 'p-0.5'
      } ${colorClasses}`}
      title={title}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      {showLabel ? <span>{displayLabel}</span> : <span className="sr-only">{displayLabel}</span>}
    </span>
  );
};

export default VerificationBadge;
