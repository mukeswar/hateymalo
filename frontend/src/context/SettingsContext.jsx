import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import API from '../services/api';

const SettingsContext = createContext();

// Public platform settings (hero CMS + feature toggles) fetched once and shared
// so admin changes in the Super Admin dashboard actually drive the public UI.
export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await API.get('/settings');
      if (res.data?.success) setSettings(res.data.data);
    } catch (err) {
      console.error('Failed to load platform settings:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext) || { settings: null, loading: true, refreshSettings: () => {} };
