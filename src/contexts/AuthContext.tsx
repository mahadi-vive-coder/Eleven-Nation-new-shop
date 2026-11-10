import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, Address } from '../types';
import { authService } from '../services/authService';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  customer: Customer | null;
  isLoggedIn: boolean;
  isLoadingSession: boolean;
  isDemoMode: boolean;
  login: (emailOrPhone: string, password: string) => Promise<Customer>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<Customer>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Customer>) => Promise<Customer>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Customer>;
  deleteAddress: (id: string) => Promise<Customer>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isSupabaseConfigured);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const activeCustomer = await authService.getSessionCustomer();
        if (isMounted) {
          setCustomer(activeCustomer);
          setIsDemoMode(!isSupabaseConfigured);
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        if (isMounted) {
          setCustomer(null);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSession(false);
        }
      }
    };

    initAuth();

    // Subscribe to Supabase Auth state changes if Supabase is configured
    if (isSupabaseConfigured && supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session?.user) {
            const refreshed = await authService.getSessionCustomer();
            if (isMounted) setCustomer(refreshed);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCustomer(null);
            authService.setCurrentCustomer(null);
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (emailOrPhone: string, pass: string): Promise<Customer> => {
    const res = await authService.login(emailOrPhone, pass);
    setCustomer(res.customer);
    setIsDemoMode(res.isDemo);
    return res.customer;
  };

  const register = async (fullName: string, email: string, phone: string, pass: string): Promise<Customer> => {
    const res = await authService.register(fullName, email, phone, pass);
    setCustomer(res.customer);
    setIsDemoMode(res.isDemo);
    return res.customer;
  };

  const logout = async (): Promise<void> => {
    await authService.logout();
    setCustomer(null);
  };

  const updateProfile = async (updates: Partial<Customer>): Promise<Customer> => {
    const updated = await authService.updateProfile(updates);
    setCustomer(updated);
    return updated;
  };

  const addAddress = async (address: Omit<Address, 'id'>): Promise<Customer> => {
    const updated = await authService.addAddress(address);
    setCustomer(updated);
    return updated;
  };

  const deleteAddress = async (id: string): Promise<Customer> => {
    const updated = await authService.deleteAddress(id);
    setCustomer(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        customer,
        isLoggedIn: Boolean(customer),
        isLoadingSession,
        isDemoMode,
        login,
        register,
        logout,
        updateProfile,
        addAddress,
        deleteAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
