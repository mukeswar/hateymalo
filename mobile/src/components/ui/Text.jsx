import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { colors, fonts } from '../../theme';

// Typography matching the website: Eczar for display, Mukta for everything else.
const VARIANTS = StyleSheet.create({
  display: { fontFamily: fonts.displayBold, fontSize: 32, lineHeight: 38, color: colors.ink },
  h1: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink },
  h2: { fontFamily: fonts.display, fontSize: 21, lineHeight: 27, color: colors.ink },
  h3: { fontFamily: fonts.display, fontSize: 18, lineHeight: 24, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: colors.inkSoft },
  medium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.ink },
  semibold: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, color: colors.ink },
  bold: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.muted },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17, color: colors.muted },
  // Small uppercase label above section titles ("eyebrow" on the website)
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1.4, textTransform: 'uppercase', color: colors.brand },
  // Nepali eyebrow — no letter-spacing/uppercase on Devanagari
  eyebrowDeva: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20, color: colors.brand },
});

export const T = ({ variant = 'body', style, children, ...rest }) => (
  <RNText style={[VARIANTS[variant] || VARIANTS.body, style]} {...rest}>
    {children}
  </RNText>
);

export default T;
