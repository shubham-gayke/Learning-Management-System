import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../api/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isAuthenticated = !!user;

  // Fetch current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await authApi.getMe();
        setUser(res.data?.user || res.user || null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const login = useCallback(
    async (credentials) => {
      const res = await authApi.login(credentials);
      if (res.requiresTwoFactor) {
        return { requiresTwoFactor: true, twoFactorToken: res.twoFactorToken };
      }
      const userData = res.data?.user || res.user;
      setUser(userData);
      toast.success('Welcome back!');
      return userData;
    },
    []
  );

  const register = useCallback(
    async (formData) => {
      const res = await authApi.register(formData);
      const userData = res.data?.user || res.user;
      setUser(userData);
      toast.success('Account created successfully!');
      return userData;
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      navigate('/login', { replace: true });
      toast.success('Logged out');
    }
  }, [navigate]);

  // Re-fetch user helper (e.g. after batch change)
  const refetchUser = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      const userData = res.data?.user || res.user || null;
      setUser(userData);
      return userData;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, register, logout, refetchUser }}
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
