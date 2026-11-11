// Shared Supabase client utility for Edge Functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

/**
 * Creates an admin Supabase client with full service_role privileges.
 * NEVER return or expose this client or its key to the caller.
 */
export function createAdminClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Creates a scoped Supabase client inheriting the caller's JWT authorization header.
 */
export function createUserClient(authHeader: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in environment');
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
