import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, api, ApiError, setToken, getToken } from '../lib/api';

const AuthContext = createContext(null);

const EMPTY_SESSION = { user: null, activeInstance: null };

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeInstance, setActiveInstance] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, []);

  const refreshActiveInstance = useCallback(async () => {
    if (!getToken()) {
      setActiveInstance(null);
      return null;
    }
    try {
      const res = await api.get('/instances/active');
      setActiveInstance(res.data ?? null);
      return res.data ?? null;
    } catch {
      setActiveInstance(null);
      return null;
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    try {
      if (getToken()) {
        // A network error or an invalid token must not leave the app stuck on
        // the full-screen loader: clear the session and show the public UI.
        try {
          const me = await authApi.me();
          setUser(me.data);
        } catch {
          setToken(null);
          setUser(null);
        }
      } else {
        // No access token in storage — the HttpOnly session cookie may still
        // be valid (e.g. opened in a new tab), so try to restore silently.
        try {
          const session = await authApi.refresh();
          setToken(session.accessToken);
          setUser(session.user);
        } catch {
          setUser(null);
        }
      }
      await refreshActiveInstance();
    } catch {
      setUser(null);
    } finally {
      // Always released, whatever happened above.
      setLoading(false);
    }
  }, [refreshActiveInstance]);

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (identifier, password) => {
      const res = await authApi.login(identifier, password);
      setToken(res.data.accessToken);
      setUser(res.data.user);
      await refreshActiveInstance();
      return res.data.user;
    },
    [refreshActiveInstance]
  );

  const register = useCallback(
    async (username, email, password) => {
      await authApi.register(username, email, password);
      return login(username, password);
    },
    [login]
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    setToken(null);
    setUser(null);
    setActiveInstance(null);
  }, []);

  const applyPoints = useCallback((points) => {
    setUser((u) => (u ? { ...u, points } : u));
  }, []);

  const value = useMemo(
    () => ({
      user,
      activeInstance,
      loading,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'ADMIN',
      login,
      register,
      logout,
      refreshUser,
      refreshActiveInstance,
      applyPoints,
      setUser,
      setActiveInstance,
    }),
    [user, activeInstance, loading, login, register, logout, refreshUser, refreshActiveInstance, applyPoints]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { EMPTY_SESSION, ApiError };
