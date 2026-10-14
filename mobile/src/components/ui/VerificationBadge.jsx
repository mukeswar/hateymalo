import React from 'react';
import { View } from 'react-native';
import { Award, BadgeCheck, Building2, Crown, HandHeart, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { colors, fonts, radius } from '../../theme';
import { T } from './Text';

const PINE = { bg: colors.pineTint, fg: colors.pine };
const MARIGOLD = { bg: colors.marigoldTint, fg: colors.marigoldText };
const BRAND = { bg: colors.brandTint, fg: colors.brand };

const humanize = (s = '') => String(s).replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

// Port of frontend/src/components/VerificationBadge.jsx — same levels and labels.
export const VerificationBadge = ({ level = 'MEMBER', isVerified = false, showLabel = true }) => {
  if (!isVerified && (!level || level === 'NEW MEMBER' || level === 'MEMBER')) return null;

  let tone = MARIGOLD;
  let Icon = Award;
  let label = humanize(level);

  if (isVerified) {
    tone = PINE; Icon = BadgeCheck;
    label = level === 'ORGANIZATION' ? 'Verified organisation' : 'Verified';
  } else if (level === 'ORGANIZATION') { Icon = Building2; label = 'Organisation'; }
  else if (level === 'VOLUNTEER') { Icon = HandHeart; label = 'Volunteer'; }
  else if (level === 'SENIOR_VOLUNTEER') { Icon = Award; label = 'Senior volunteer'; }
  else if (level === 'COMMUNITY_LEAD') { Icon = Crown; label = 'Community lead'; }
  else if (level === 'ADMIN' || level === 'SUPER_ADMIN') {
    tone = BRAND; Icon = ShieldAlert; label = level === 'SUPER_ADMIN' ? 'Super admin' : 'Admin';
  } else if (level === 'MODERATOR') { tone = BRAND; Icon = ShieldCheck; label = 'Moderator'; }

  return (
    <View
      accessibilityLabel={isVerified ? 'Verified by the Hateymalo team' : label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 4,
        backgroundColor: tone.bg,
        borderRadius: radius.pill,
        paddingHorizontal: showLabel ? 8 : 3,
        paddingVertical: showLabel ? 3 : 3,
      }}
    >
      <Icon size={13} color={tone.fg} />
      {showLabel ? <T style={{ fontFamily: fonts.semibold, fontSize: 12, lineHeight: 15, color: tone.fg }}>{label}</T> : null}
    </View>
  );
};

export default VerificationBadge;
