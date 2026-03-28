'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { authService } from '@/services/auth.service';

interface AuthContextType {
  user: User | null;
  storeId: string | null;
  loading: boolean;
  login: (email: string, password: string, userType: 'member' | 'employee') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const storedUser = localStorage.getItem('user');
    const storedStoreId = localStorage.getItem('storeId');
    const token = localStorage.getItem('access_token');

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
      setStoreId(storedStoreId);
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string, userType: 'member' | 'employee') => {
    try {
      const response = userType === 'member'
        ? await authService.login({ email, password })
        : await authService.loginEmployee({ email, password });

      // Store tokens and user data
      localStorage.setItem('access_token', response.accessToken);
      localStorage.setItem('refresh_token', response.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.user));

      // For demo, set a default storeId (in production, get from user data)
      const defaultStoreId = 'store-' + response.user.id.slice(0, 8);
      localStorage.setItem('storeId', defaultStoreId);

      setUser(response.user);
      setStoreId(defaultStoreId);

      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setStoreId(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        storeId,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
