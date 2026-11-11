// Shared authentication & role verification for Edge Functions
import { createAdminClient, createUserClient } from './supabaseClient.ts';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

export type AllowedAdminRole = 'super_admin' | 'order_manager' | 'product_manager' | 'content_manager';

/**
 * Validates the caller's JWT token and verifies their administrative role in PostgreSQL public.user_roles.
 * Throws an Error with 401/403 status code if validation fails.
 */
export async function requireAdminAuth(
  req: Request,
  allowedRoles: AllowedAdminRole[] = ['super_admin', 'order_manager']
): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or malformed Authorization header (HTTP 401)');
  }

  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const userClient = createUserClient(authHeader);

  // 1. Validate JWT session against Supabase Auth
  const { data: { user }, error: userError } = await userClient.auth.getUser(token);
  if (userError || !user) {
    throw new Error(`Unauthorized session: ${userError?.message || 'Invalid JWT'} (HTTP 401)`);
  }

  // 2. Query user_roles with admin client to verify database authority
  const adminClient = createAdminClient();
  const { data: roles, error: rolesError } = await adminClient
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id);

  if (rolesError || !roles || roles.length === 0) {
    throw new Error('Forbidden: No administrative roles assigned to account (HTTP 403)');
  }

  const matchedRole = roles.find((r) => allowedRoles.includes(r.role as AllowedAdminRole));
  if (!matchedRole) {
    throw new Error(`Forbidden: Insufficient privileges. Required: ${allowedRoles.join(' or ')} (HTTP 403)`);
  }

  return {
    id: user.id,
    email: user.email || '',
    role: matchedRole.role,
  };
}
