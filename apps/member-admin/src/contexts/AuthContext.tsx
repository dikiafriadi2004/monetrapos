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
        try {
          const userData = await authService.getCurrentUser();
          const user = {
            ...userData.user,
            type: (userData as any).type ?? userData.user.type,
            permissions: (userData as any).permissions ?? userData.user.permissions ?? [],
          };
          setUser(user);
          setCompany(userData.company);
          if (userData.subscription) {
            setSubscription(userData.subscription);
          }
        } catch {
          // Token might be for employee — try to decode it
          try {
            const parts = token.split('.');
            if (parts.length < 3) throw new Error('Invalid token format');
            const payload = JSON.parse(atob(parts[1]));
            if (payload.type === 'employee') {
              // Employee token — set minimal user data
              setUser({
                id: payload.sub,
                email: payload.email,
                name: payload.name || 'Employee',
                firstName: payload.name?.split(' ')[0] || 'Employee',
                lastName: payload.name?.split(' ').slice(1).join(' ') || '',
                role: 'cashier' as any,
                type: 'employee',
                companyId: payload.companyId,
                isActive: true,
                emailVerified: true,
                permissions: payload.permissions || [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as any);
              // Don't set company for employees — they have limited access
            } else {
              throw new Error('Invalid token');
            }
          } catch {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      } catch (err) {
        console.error('Failed to load user:', err);
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
      const userData = {
        ...response.user,
        type: (response as any).type ?? response.user.type,
        permissions: (response as any).permissions ?? response.user.permissions ?? [],
      };
      setUser(userData);
      setCompany(response.company);

      // Load subscription after login
      try {
        const meData = await authService.getCurrentUser();
        if (meData.subscription) setSubscription(meData.subscription);
      } catch {
        // Non-critical — subscription will load on next page visit
      }

      toast.success('Login berhasil!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Login gagal';
      setError(errorMessage);
      throw err; // Re-throw so login page can catch it
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
      // Merge type/permissions from response
      const user = {
        ...userData.user,
        type: (userData as any).type ?? userData.user.type,
        permissions: (userData as any).permissions ?? userData.user.permissions ?? [],
      };
      setUser(user);
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
