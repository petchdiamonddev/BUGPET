import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [activeInstance, setActiveInstance] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshActiveInstance = useCallback(async () => {
    try {
      const token = localStorage.getItem('petbug_token');
      if (!token) {
        setActiveInstance(null);
        return;
      }
      const res = await apiRequest('/instances/active');
      setActiveInstance(res.data || null);
    } catch (err) {
      setActiveInstance(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('petbug_token');
      if (!token) {
        setUser(null);
        setActiveInstance(null);
        setLoading(false);
        return;
      }
      const res = await apiRequest('/auth/me');
      setUser(res.data || null);
      await refreshActiveInstance();
    } catch (err) {
      localStorage.removeItem('petbug_token');
      setUser(null);
      setActiveInstance(null);
    } finally {
      setLoading(false);
    }
  }, [refreshActiveInstance]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Periodic poll for active instance status when one is running
  useEffect(() => {
    if (!activeInstance) return;
    const interval = setInterval(() => {
      refreshActiveInstance();
    }, 10000);
    return () => clearInterval(interval);
  }, [activeInstance, refreshActiveInstance]);

  const login = async (identifier, password) => {
    const res = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    if (res.data?.accessToken) {
      localStorage.setItem('petbug_token', res.data.accessToken);
    }
    setUser(res.data.user);
    await refreshActiveInstance();
    return res;
  };

  const register = async (username, email, password) => {
    const res = await apiRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    // Auto-login after register
    return await login(username, password);
  };

  const logout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('petbug_token');
    setUser(null);
    setActiveInstance(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeInstance,
        loading,
        login,
        register,
        logout,
        refreshUser,
        refreshActiveInstance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
