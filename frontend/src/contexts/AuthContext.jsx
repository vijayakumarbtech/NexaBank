import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));

  const loadUser = useCallback(async () => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
      connectSocket(data.user._id);
    } catch {
      localStorage.removeItem('accessToken');
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = (token, userData) => {
    localStorage.setItem('accessToken', token);
    setAccessToken(token);
    setUser(userData);
    connectSocket(userData._id);
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('accessToken');
    setAccessToken(null);
    setUser(null);
    disconnectSocket();
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
