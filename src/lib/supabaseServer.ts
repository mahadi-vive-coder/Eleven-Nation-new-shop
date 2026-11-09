import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

export interface AuthenticatedAdminUser {
  userId: string;
  email: string;
  role: 'super_admin' | 'order_manager' | 'product_manager' | 'content_manager';
}

/**
 * Validates the caller's JWT token from Next.js request headers.
 * Resolves the authenticated user and verifies their administrative role in the database.
 */
export async function authenticateAdminRequest(
  reqHeaders: Headers,
  allowedRoles: Array<'super_admin' | 'order_manager' | 'product_manager' | 'content_manager'> = ['super_admin', 'order_manager']
): Promise<{ user: AuthenticatedAdminUser | null; error: string | null }> {
  const authHeader = reqHeaders.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { user: null, error: 'Missing or malformed Authorization header' };
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const serverClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: { user }, error: userError } = await serverClient.auth.getUser(token);
  if (userError || !user) {
    return { user: null, error: 'Invalid or expired authentication session' };
  }

  // Query user_roles directly using the user's authenticated client
  const { data: roles, error: rolesError } = await serverClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (rolesError || !roles || roles.length === 0) {
    return { user: null, error: 'No administrative roles assigned to user' };
  }

  const matchedRole = roles.find((r) => allowedRoles.includes(r.role as any));
  if (!matchedRole) {
    return { user: null, error: 'User does not possess the required administrative permissions' };
  }

  return {
    user: {
      userId: user.id,
      email: user.email || '',
      role: matchedRole.role as any,
    },
    error: null,
  };
}
