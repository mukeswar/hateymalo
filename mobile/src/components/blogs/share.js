import { Platform, Share } from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { API_URL } from '../../lib/api';

// Public website link for a page. When the API is a deployed site
// (https://example.org/api) the website lives on the same origin; in local
// development there is no public site, so an app deep link is used instead.
export const publicLink = (webPath, appPath) => {
  const m = /^(https:\/\/[^/]+)\/api$/i.exec(API_URL || '');
  if (m && !/localhost|127\.0\.0\.1/.test(m[1])) return `${m[1]}${webPath}`;
  return Linking.createURL(appPath);
};

// Native share sheet; on web (no share sheet everywhere) copy the link like the website does.
// Resolves to 'shared' | 'copied' | 'dismissed'.
export const shareLink = async ({ title, url }) => {
  if (Platform.OS === 'web') {
    if (globalThis.navigator?.share) {
      try {
        await globalThis.navigator.share({ title, url });
        return 'shared';
      } catch {
        /* fall through to copy */
      }
    }
    await Clipboard.setStringAsync(url);
    return 'copied';
  }
  const res = await Share.share(
    Platform.OS === 'ios' ? { title, url, message: title } : { title, message: `${title}\n${url}` },
  );
  return res.action === Share.dismissedAction ? 'dismissed' : 'shared';
};
