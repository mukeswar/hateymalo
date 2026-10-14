import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// The JWT lives in the OS keychain/keystore on device. SecureStore has no web
// implementation, so the web preview falls back to localStorage like the website.
const isWeb = Platform.OS === 'web';

export const storage = {
  async get(key) {
    if (isWeb) {
      try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key, value) {
    if (isWeb) {
      try { globalThis.localStorage?.setItem(key, value); } catch { /* private mode */ }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key) {
    if (isWeb) {
      try { globalThis.localStorage?.removeItem(key); } catch { /* private mode */ }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

export const TOKEN_KEY = 'haatemalo_token';
