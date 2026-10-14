import { colors, fonts } from '../theme';

// Shared header look for every stacked (non-tab) screen, incl. the admin stack.
export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.paper },
  headerShadowVisible: false,
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.display, fontSize: 18, color: colors.ink },
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.paper },
};
