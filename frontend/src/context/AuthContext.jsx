import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('haatemalo_token') || '');
  const [loading, setLoading] = useState(true);

  // Check current auth status on mount
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/me');
          if (res.data.success) {
            setUser(res.data.data);
          } else {
            logout();
          }
        } catch (error) {
          console.error('Failed to load user context:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    if (res.data.success) {
      const { token: authToken, ...userData } = res.data.data;
      localStorage.setItem('haatemalo_token', authToken);
      setToken(authToken);
      setUser(userData);
      return res.data;
    }
  };

  const register = async (formData) => {
    const res = await API.post('/auth/register', formData);
    if (res.data.success) {
      const { token: authToken, ...userData } = res.data.data;
      localStorage.setItem('haatemalo_token', authToken);
      setToken(authToken);
      setUser(userData);
      return res.data;
    }
  };

  const logout = () => {
    localStorage.removeItem('haatemalo_token');
    setToken('');
    setUser(null);
  };

  const updateProfile = async (formData) => {
    const res = await API.put('/auth/profile', formData);
    if (res.data.success) {
      setUser(res.data.data);
      return res.data;
    }
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const res = await API.get('/auth/me');
        if (res.data.success) {
          setUser(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshUser,
        isAdmin: ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'].includes(user?.role),
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        // Staff permission check (the server enforces the same rules; this only hides UI)
        can: (permission) => user?.role === 'SUPER_ADMIN' || (user?.permissions || []).includes(permission),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
