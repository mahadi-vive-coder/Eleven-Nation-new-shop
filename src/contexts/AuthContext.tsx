import React, { createContext, useContext, useState, useEffect } from 'react';
import { Customer, Address } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  customer: Customer | null;
  isLoggedIn: boolean;
  login: (emailOrPhone: string, password: string) => Promise<Customer>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<Customer>;
  logout: () => void;
  updateProfile: (updates: Partial<Customer>) => Promise<Customer>;
  addAddress: (address: Omit<Address, 'id'>) => Promise<Customer>;
  deleteAddress: (id: string) => Promise<Customer>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<Customer | null>(() => authService.getCurrentCustomer());

  useEffect(() => {
    // Keep in sync with service
    const current = authService.getCurrentCustomer();
    setCustomer(current);
  }, []);

  const login = async (emailOrPhone: string, pass: string): Promise<Customer> => {
    const res = await authService.login(emailOrPhone, pass);
    setCustomer(res.customer);
    return res.customer;
  };

  const register = async (fullName: string, email: string, phone: string, pass: string): Promise<Customer> => {
    const res = await authService.register(fullName, email, phone, pass);
    setCustomer(res.customer);
    return res.customer;
  };

  const logout = () => {
    authService.logout();
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
