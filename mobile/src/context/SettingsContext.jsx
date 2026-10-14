import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import API from '../lib/api';

const SettingsContext = createContext(null);

// Public platform settings (hero CMS + feature toggles) so Super Admin changes
// drive the app exactly like the website (e.g. allowPublicDonations hides Donate).
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await API.get('/settings');
      if (res.data?.success) setSettings(res.data.data);
    } catch { /* keep last known settings */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshSettings(); }, [refreshSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () =>
  useContext(SettingsContext) || { settings: null, loading: true, refreshSettings: () => {} };
