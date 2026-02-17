'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useCallback } from 'react';
import clientAuth, { ClientUser } from '@/app/lib/client/auth';

interface ClientAuthContextType {
  user: ClientUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  setUser: (user: ClientUser | null) => void;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ClientUser | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      // Check if we have a stored token
      const hasToken = clientAuth.isAuthenticated();
      if (hasToken) {
        // Validate the token and get user data
        const isValid = await clientAuth.validateToken();
        
        if (isValid) {
          const currentUser = await clientAuth.getCurrentUser();
          setUser(currentUser);
        } else {
          // Token is invalid, clear it
          clientAuth.logout();
          setUser(null);
        }
      } else {
        // No token, ensure user is null
        setUser(null);
      }
    } catch (error) {
      console.error('Client auth check error:', error);
      clientAuth.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Listen for storage changes (e.g., when token is removed in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'client_jwt' || e.key === 'client_user') {
        // Token or user data changed, re-check authentication
        checkAuth();
      }
    };

    // Listen for storage events from other tabs/windows
    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab logout)
    const handleCustomStorageChange = () => {
      checkAuth();
    };
    window.addEventListener('client-auth-changed', handleCustomStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('client-auth-changed', handleCustomStorageChange);
    };
  }, [checkAuth]);

  // Periodically validate token (every 5 minutes)
  useEffect(() => {
    if (!clientAuth.isAuthenticated()) return;

    const interval = setInterval(() => {
      checkAuth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await clientAuth.login({ email, password });
      setUser(response.user);
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('client-auth-changed'));
      }
    } catch (error: any) {
      throw new Error(error.message || 'Client login failed');
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      const response = await clientAuth.register({ email, password, firstName, lastName, phone });
      setUser(response.user);
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('client-auth-changed'));
      }
    } catch (error: any) {
      throw new Error(error.message || 'Client registration failed');
    }
  };

  const logout = useCallback(() => {
    clientAuth.logout();
    setUser(null);
    // Dispatch event to notify other components
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('client-auth-changed'));
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    setUser
  }), [user, loading, logout]);

  return (
    <ClientAuthContext.Provider value={value}>
      {children}
    </ClientAuthContext.Provider>
  );
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext);
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider');
  }
  return context;
}

