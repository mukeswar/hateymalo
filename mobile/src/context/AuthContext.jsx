import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import API, { setUnauthorizedHandler } from '../lib/api';
import { storage, TOKEN_KEY } from '../lib/storage';

const AuthContext = createContext(null);

const STAFF = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

// Same contract as frontend/src/context/AuthContext.jsx so screens port 1:1.
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(true);

  const logout = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    setToken('');
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { logout(); });
    (async () => {
      const saved = await storage.get(TOKEN_KEY);
      if (saved) {
        setToken(saved);
        try {
          const res = await API.get('/auth/me');
          if (res.data?.success) setUser(res.data.data);
          else await logout();
        } catch (err) {
          // Offline: keep the token so the next launch can retry; 401 is handled above.
          if (err?.response) await logout();
        }
      }
      setLoading(false);
    })();
  }, [logout]);

  const acceptSession = async (data) => {
    const { token: authToken, ...userData } = data;
    await storage.set(TOKEN_KEY, authToken);
    setToken(authToken);
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data?.success) await acceptSession(res.data.data);
    return res.data;
  };

  const register = async (formData) => {
    const res = await API.post('/auth/register', formData);
    if (res.data?.success) await acceptSession(res.data.data);
    return res.data;
  };

  const updateProfile = async (formData) => {
    const res = await API.put('/auth/profile', formData);
    if (res.data?.success) setUser(res.data.data);
    return res.data;
  };

  const refreshUser = useCallback(async () => {
    try {
      const res = await API.get('/auth/me');
      if (res.data?.success) setUser(res.data.data);
    } catch { /* keep current user */ }
  }, []);

  const value = useMemo(() => ({
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    refreshUser,
    isAdmin: STAFF.includes(user?.role),
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    // Staff permission check (the server enforces the same rules; this only hides UI)
    can: (permission) => user?.role === 'SUPER_ADMIN' || (user?.permissions || []).includes(permission),
  }), [user, token, loading, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
