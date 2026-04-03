'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company, LoginRequest, AuthState, Subscription } from '@/types';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

interface AuthContextType extends AuthState {
  subscription: Subscription | null;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setSubscription: (subscription: Subscription | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAuthenticated = !!user;

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Try to get current user from API
        const userData = await authService.getCurrentUser();
        setUser(userData.user);
        setCompany(userData.company);
        if (userData.subscription) {
          setSubscription(userData.subscription);
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        // Clear invalid tokens
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (credentials: LoginRequest) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await authService.login(credentials);

      // Store tokens
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);

      // Set user and company
      setUser(response.user);
      setCompany(response.company);

      toast.success('Login successful!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Login failed';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    try {
      authService.logout();
      
      // Clear state
      setUser(null);
      setCompany(null);
      setSubscription(null);
      setError(null);

      // Clear localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      toast.success('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData.user);
      setCompany(userData.company);
      if (userData.subscription) {
        setSubscription(userData.subscription);
      }
    } catch (err) {
      console.error('Failed to refresh user:', err);
      throw err;
    }
  };

  const value: AuthContextType = {
    user,
    company,
    subscription,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    setSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
