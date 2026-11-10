import { Customer, Address } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const AUTH_USER_KEY = 'eleven_nation_auth_customer';

export const authService = {
  /**
   * Check if Supabase session is active or load offline demo customer.
   * When Supabase is configured, Supabase Auth is the sole authority.
   */
  async getSessionCustomer(): Promise<Customer | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session?.user) {
          this.setCurrentCustomer(null);
          return null;
        }

        const user = session.user;

        // Fetch profile metadata from public.profiles
        let fullName = user.user_metadata?.full_name || user.user_metadata?.name || 'Valued Customer';
        let phone = user.user_metadata?.phone || '';

        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            if (profile.full_name) fullName = profile.full_name;
            if (profile.phone) phone = profile.phone;
          }
        } catch (profileErr) {
          console.warn('Could not load profile from database:', profileErr);
        }

        // Fetch user addresses from public.customer_addresses
        let addresses: Address[] = [];
        try {
          const { data: addressRows } = await supabase
            .from('customer_addresses')
            .select('*')
            .eq('customer_id', user.id)
            .order('created_at', { ascending: false });

          if (addressRows && Array.isArray(addressRows)) {
            addresses = addressRows.map((a) => ({
              id: a.id,
              district: a.district,
              area: a.area,
              fullAddress: a.full_address,
              deliveryInstructions: a.delivery_instructions,
              isDefault: a.is_default,
            }));
          }
        } catch (addrErr) {
          console.warn('Could not load customer addresses from database:', addrErr);
        }

        const customer: Customer = {
          id: user.id,
          fullName,
          email: user.email || '',
          phone,
          addresses,
          created_at: user.created_at,
        };

        this.setCurrentCustomer(customer);
        return customer;
      } catch (err) {
        console.error('Session retrieval error:', err);
        return null;
      }
    }

    // Local / Offline demo development fallback
    return this.getLocalStoredCustomer();
  },

  getLocalStoredCustomer(): Customer | null {
    try {
      const stored = localStorage.getItem(AUTH_USER_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
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

  /**
   * Customer Login
   * When Supabase is configured: authenticates strictly via supabase.auth.signInWithPassword.
   * Throws an Error if credentials are invalid; never creates fake local customers.
   */
  async login(emailOrPhone: string, password: string): Promise<{ customer: Customer; isDemo: boolean }> {
    if (isSupabaseConfigured && supabase) {
      const cleanEmail = emailOrPhone.trim();

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Invalid email or password. Please verify your credentials.');
      }

      const customer = await this.getSessionCustomer();
      if (!customer) {
        throw new Error('Authenticated, but failed to load customer profile.');
      }

      return { customer, isDemo: false };
    }

    // Offline Demo Mode (Only when Supabase environment variables are unconfigured)
    await new Promise((r) => setTimeout(r, 400));
    const cleanId = emailOrPhone.trim();
    const isEmail = cleanId.includes('@');
    const demoCustomer: Customer = {
      id: `demo-${Date.now()}`,
      fullName: isEmail ? cleanId.split('@')[0] : 'Demo Customer',
      email: isEmail ? cleanId : 'customer@elevennation.shop',
      phone: !isEmail ? cleanId : '01700000000',
      addresses: [],
    };
    this.setCurrentCustomer(demoCustomer);
    return { customer: demoCustomer, isDemo: true };
  },

  /**
   * Customer Registration
   * When Supabase is configured: creates real user in Supabase Auth.
   * Throws an Error if sign up fails; never creates fake local customers.
   */
  async register(
    fullName: string,
    email: string,
    phone: string,
    password: string
  ): Promise<{ customer: Customer; isDemo: boolean }> {
    if (isSupabaseConfigured && supabase) {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = phone.trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Registration failed. Please check your details and try again.');
      }

      // Sync into profiles table if authenticated session was established immediately
      if (data.session) {
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            full_name: cleanName,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          });
        } catch (profileErr) {
          console.warn('Profile sync warning:', profileErr);
        }
      }

      const customer: Customer = {
        id: data.user.id,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        addresses: [],
        created_at: data.user.created_at,
      };

      this.setCurrentCustomer(customer);
      return { customer, isDemo: false };
    }

    // Offline Demo Mode
    await new Promise((r) => setTimeout(r, 450));
    const newDemoCustomer: Customer = {
      id: `demo-${Date.now()}`,
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      addresses: [],
    };
    this.setCurrentCustomer(newDemoCustomer);
    return { customer: newDemoCustomer, isDemo: true };
  },

  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (error) {
        throw new Error(error.message);
      }
      return {
        success: true,
        message: `Password reset link sent to ${email.trim()}. Please check your inbox.`,
      };
    }

    await new Promise((r) => setTimeout(r, 400));
    return {
      success: true,
      message: `[Demo Mode] Password reset link sent to ${email.trim()}.`,
    };
  },

  async updateProfile(updates: Partial<Customer>): Promise<Customer> {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated customer session found.');

      // Update auth user metadata
      await supabase.auth.updateUser({
        data: {
          full_name: updates.fullName,
          phone: updates.phone,
        },
      });

      // Update profiles database table
      await supabase
        .from('profiles')
        .update({
          full_name: updates.fullName,
          phone: updates.phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      const refreshed = await this.getSessionCustomer();
      if (!refreshed) throw new Error('Failed to refresh customer profile.');
      return refreshed;
    }

    const current = this.getLocalStoredCustomer();
    if (!current) throw new Error('No authenticated customer found');
    const updated = { ...current, ...updates };
    this.setCurrentCustomer(updated);
    return updated;
  },

  async addAddress(address: Omit<Address, 'id'>): Promise<Customer> {
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated customer session found.');

      // If this address is set as default, reset other addresses first
      if (address.isDefault) {
        await supabase
          .from('customer_addresses')
          .update({ is_default: false })
          .eq('customer_id', user.id);
      }

      const { error: insertError } = await supabase.from('customer_addresses').insert({
        customer_id: user.id,
        full_name: user.user_metadata?.full_name || 'Customer',
        phone: user.user_metadata?.phone || '',
        district: address.district,
        area: address.area,
        full_address: address.fullAddress,
        delivery_instructions: address.deliveryInstructions || null,
        is_default: Boolean(address.isDefault),
      });

      if (insertError) {
        throw new Error(insertError.message || 'Failed to save address.');
      }

      const refreshed = await this.getSessionCustomer();
      if (!refreshed) throw new Error('Failed to reload addresses.');
      return refreshed;
    }

    const current = this.getLocalStoredCustomer();
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
    if (isSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated customer session found.');

      const { error } = await supabase
        .from('customer_addresses')
        .delete()
        .eq('id', addressId)
        .eq('customer_id', user.id);

      if (error) {
        throw new Error(error.message || 'Failed to delete address.');
      }

      const refreshed = await this.getSessionCustomer();
      if (!refreshed) throw new Error('Failed to reload addresses.');
      return refreshed;
    }

    const current = this.getLocalStoredCustomer();
    if (!current) throw new Error('No authenticated customer found');
    const addresses = current.addresses.filter((a) => a.id !== addressId);
    const updated = { ...current, addresses };
    this.setCurrentCustomer(updated);
    return updated;
  },

  async logout(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    this.setCurrentCustomer(null);
  },
};
