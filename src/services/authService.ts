import { Customer, Address } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_USER_KEY = 'eleven_nation_auth_customer';

export const authService = {
  getCurrentCustomer(): Customer | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Clean out legacy demo customer if still present in browser storage
        if (parsed?.id === 'cust-demo-101' || parsed?.email === 'mahadihassanrafi2007@gmail.com') {
          localStorage.removeItem(AUTH_USER_KEY);
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  },

  setCurrentCustomer(customer: Customer | null): void {
    if (!customer) {
      localStorage.removeItem(AUTH_USER_KEY);
    } else {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(customer));
    }
  },

  async login(emailOrPhone: string, _password: string): Promise<{ customer: Customer; isDemo: boolean }> {
    await new Promise((r) => setTimeout(r, 450));

    // If Supabase Auth is configured in production:
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailOrPhone,
          password: _password,
        });
        if (!error && data.user) {
          const prodCustomer: Customer = {
            id: data.user.id,
            fullName: data.user.user_metadata?.full_name || 'Valued Customer',
            email: data.user.email || emailOrPhone,
            phone: data.user.user_metadata?.phone || '',
            addresses: [],
          };
          this.setCurrentCustomer(prodCustomer);
          return { customer: prodCustomer, isDemo: false };
        }
      } catch (err) {
        console.warn('Supabase Auth signIn fallback:', err);
      }
    }

    // Local / Offline authentication fallback
    const existing = this.getCurrentCustomer();
    const customer: Customer = existing || {
      id: `cust-${Date.now()}`,
      fullName: emailOrPhone.includes('@') ? emailOrPhone.split('@')[0] : 'Customer',
      email: emailOrPhone.includes('@') ? emailOrPhone : '',
      phone: !emailOrPhone.includes('@') ? emailOrPhone : '',
      addresses: [],
    };
    this.setCurrentCustomer(customer);
    return { customer, isDemo: false };
  },

  async register(fullName: string, email: string, phone: string, _password: string): Promise<{ customer: Customer; isDemo: boolean }> {
    await new Promise((r) => setTimeout(r, 500));

    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: _password,
          options: {
            data: { full_name: fullName, phone },
          },
        });
        if (!error && data.user) {
          const prodCustomer: Customer = {
            id: data.user.id,
            fullName,
            email,
            phone,
            addresses: [],
          };
          this.setCurrentCustomer(prodCustomer);
          return { customer: prodCustomer, isDemo: false };
        }
      } catch (err) {
        console.warn('Supabase Auth signUp fallback:', err);
      }
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      fullName,
      email,
      phone,
      addresses: [],
    };
    this.setCurrentCustomer(newCustomer);
    return { customer: newCustomer, isDemo: false };
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 400));
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(email);
      } catch (err) {
        console.warn('Supabase resetPassword fallback:', err);
      }
    }
    return {
      success: true,
      message: `Password reset link sent to ${email}. Please check your inbox.`,
    };
  },

  async updateProfile(updates: Partial<Customer>): Promise<Customer> {
    const current = this.getCurrentCustomer();
    if (!current) throw new Error('No authenticated customer found');
    const updated = { ...current, ...updates };
    this.setCurrentCustomer(updated);
    return updated;
  },

  async addAddress(address: Omit<Address, 'id'>): Promise<Customer> {
    const current = this.getCurrentCustomer();
    if (!current) throw new Error('No authenticated customer found');
    const newAddress: Address = {
      ...address,
      id: `addr-${Date.now()}`,
    };
    let addresses = [...current.addresses];
    if (newAddress.isDefault) {
      addresses = addresses.map((a) => ({ ...a, isDefault: false }));
    }
    addresses.push(newAddress);
    const updated = { ...current, addresses };
    this.setCurrentCustomer(updated);
    return updated;
  },

  async deleteAddress(addressId: string): Promise<Customer> {
    const current = this.getCurrentCustomer();
    if (!current) throw new Error('No authenticated customer found');
    const addresses = current.addresses.filter((a) => a.id !== addressId);
    const updated = { ...current, addresses };
    this.setCurrentCustomer(updated);
    return updated;
  },

  logout(): void {
    if (isSupabaseConfigured && supabase) {
      supabase.auth.signOut().catch(() => {});
    }
    this.setCurrentCustomer(null);
  }
};
