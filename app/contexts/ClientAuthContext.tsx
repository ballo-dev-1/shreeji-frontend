'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      
      // Check if we have a stored token
      if (clientAuth.isAuthenticated()) {
        // Validate the token and get user data
        const isValid = await clientAuth.validateToken();
        
        if (isValid) {
          const currentUser = await clientAuth.getCurrentUser();
          setUser(currentUser);
        } else {
          // Token is invalid, clear it
          clientAuth.logout();
        }
      }
    } catch (error) {
      console.error('Client auth check error:', error);
      clientAuth.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await clientAuth.login({ email, password });
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.message || 'Client login failed');
    }
  };

  const register = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      const response = await clientAuth.register({ email, password, firstName, lastName, phone });
      setUser(response.user);
    } catch (error: any) {
      throw new Error(error.message || 'Client registration failed');
    }
  };

  const logout = () => {
    clientAuth.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    setUser
  };

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

