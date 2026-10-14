// HATEYMALO design tokens — mirrors frontend/src/index.css so the app and the
// website read as one product. Marigold is for fills/progress only, never text
// (use marigoldText for text on light surfaces).
export const colors = {
  paper: '#FBF7F0',
  paperDeep: '#F4ECDF',
  sand: '#E8DFD2',
  white: '#FFFFFF',
  ink: '#1F1B16',
  inkSoft: '#3A332B',
  muted: '#6B6157',

  brand: '#B5232C',
  brandDark: '#8E1A22',
  brandTint: '#FBE9E6',

  pine: '#1E5A47',
  pineDark: '#15412F',
  pineTint: '#E4EFE9',

  marigold: '#E9A23B',
  marigoldText: '#8A5A00',
  marigoldTint: '#FCF0DA',

  sky: '#2F5D8A',
  skyTint: '#E6EEF6',

  night: '#1A1714',
};

// Custom fonts need a family per weight (fontWeight is ignored on Android).
export const fonts = {
  display: 'Eczar_600SemiBold',
  displayBold: 'Eczar_700Bold',
  body: 'Mukta_400Regular',
  medium: 'Mukta_500Medium',
  semibold: 'Mukta_600SemiBold',
  bold: 'Mukta_700Bold',
};

export const radius = { sm: 10, md: 14, card: 20, pill: 999 };

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const shadow = {
  soft: {
    shadowColor: colors.ink,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lift: {
    shadowColor: colors.ink,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
};

// Status → colour pairs used by chips across posts, blogs, events, reports, donations.
export const statusTone = (status = '') => {
  const s = String(status).toUpperCase();
  if (['APPROVED', 'VERIFIED', 'COMPLETED', 'RESOLVED', 'ACTIVE', 'PUBLISHED', 'SUCCESS'].includes(s))
    return { bg: colors.pineTint, fg: colors.pine };
  if (['PENDING', 'UNDER_REVIEW', 'IN_PROGRESS', 'UPCOMING', 'DRAFT'].includes(s))
    return { bg: colors.marigoldTint, fg: colors.marigoldText };
  if (['REJECTED', 'CANCELLED', 'BANNED', 'FAILED', 'URGENT', 'SUSPENDED', 'REMOVED'].includes(s))
    return { bg: colors.brandTint, fg: colors.brand };
  return { bg: colors.skyTint, fg: colors.sky };
};
