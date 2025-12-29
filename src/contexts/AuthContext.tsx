'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'sales';
  avatar_url?: string;
  is_active: boolean;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, role?: 'admin' | 'sales') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAdmin: boolean;
  isSales: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const storedSession = localStorage.getItem('auth_session');
    const storedUser = localStorage.getItem('auth_user');

    if (storedSession && storedUser) {
      const parsedSession = JSON.parse(storedSession) as Session;
      const parsedUser = JSON.parse(storedUser) as User;

      // Check if session is expired
      if (parsedSession.expires_at * 1000 > Date.now()) {
        setSession(parsedSession);
        setUser(parsedUser);
      } else {
        // Clear expired session
        localStorage.removeItem('auth_session');
        localStorage.removeItem('auth_user');
      }
    }

    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Login failed' };
      }

      setUser(data.user);
      setSession(data.session);

      // Store in localStorage
      localStorage.setItem('auth_session', JSON.stringify(data.session));
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'sales' = 'sales'
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${BACKEND_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.message || 'Registration failed' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setSession(null);
    localStorage.removeItem('auth_session');
    localStorage.removeItem('auth_user');
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    login,
    register,
    logout,
    isAdmin: user?.role === 'admin',
    isSales: user?.role === 'sales',
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

