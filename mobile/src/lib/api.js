import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { storage, TOKEN_KEY } from './storage';

// Where the Express API lives:
// 1. EXPO_PUBLIC_API_URL (set it to the deployed site, e.g. https://hateymalo.com/api)
// 2. In development, the machine running `expo start` (same LAN IP the phone already
//    reaches for Metro) on the backend's port 5000.
const resolveBaseURL = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, '');
  if (Platform.OS === 'web') return 'http://localhost:5000/api';
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) return `http://${host}:5000/api`;
  return Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api';
};

export const API_URL = resolveBaseURL();

const API = axios.create({ baseURL: API_URL, timeout: 20000 });

API.interceptors.request.use(async (config) => {
  const token = await storage.get(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // Native fetch may send no User-Agent; the ad tracker would otherwise treat it as a bot
  config.headers['X-Hateymalo-Client'] = 'app';
  return config;
});

// Lets AuthContext sign the user out when the server rejects the token.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

API.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

// Same message extraction the web pages use: server message first, then network text.
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || (err?.message === 'Network Error' ? 'Cannot reach the server. Check your connection.' : null) || fallback;

export default API;
