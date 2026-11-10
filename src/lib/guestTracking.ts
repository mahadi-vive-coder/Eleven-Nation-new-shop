import { supabase } from './supabase';

/**
 * Validates IPv4 and IPv6 addresses (including compressed notation)
 */
export function isValidIp(ip: string): boolean {
  if (!ip || typeof ip !== 'string') return false;
  const clean = ip.trim();

  // IPv4: 0.0.0.0 - 255.255.255.255
  const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  if (ipv4Pattern.test(clean)) return true;

  // IPv6: standard and compressed notation
  const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  return ipv6Pattern.test(clean);
}

/**
 * Extracts client IP securely using a strict trusted-proxy hierarchy.
 * Never silently defaults to 127.0.0.1.
 */
export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const getHeader = (name: string): string | null => {
    if ('get' in headers && typeof headers.get === 'function') {
      return headers.get(name);
    }
    const val = (headers as Record<string, string | string[] | undefined>)[name.toLowerCase()];
    if (Array.isArray(val)) return val[0] || null;
    return val || null;
  };

  // 1. Cloudflare Edge
  const cfIp = getHeader('cf-connecting-ip');
  if (cfIp && isValidIp(cfIp.trim())) {
    return cfIp.trim();
  }

  // 2. Verified Edge Reverse Proxy (Vercel / Nginx)
  const realIp = getHeader('x-real-ip');
  if (realIp && isValidIp(realIp.trim())) {
    return realIp.trim();
  }

  // 3. X-Forwarded-For: Client IP is the leftmost hop
  const forwardedFor = getHeader('x-forwarded-for');
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map((h) => h.trim());
    for (const hop of hops) {
      if (isValidIp(hop)) {
        return hop;
      }
    }
  }

  throw new Error('Unable to securely determine client IP address from request headers');
}

export interface GuestTrackingResult {
  success: boolean;
  message?: string;
  verified_by?: 'guest_access_token' | 'phone_match';
  order?: {
    order_number: string;
    status: string;
    customer_name: string;
    delivery_address: string;
    delivery_zone: string;
    subtotal: number;
    delivery_charge: number;
    discount_amount: number;
    total: number;
    courier_name?: string;
    tracking_number?: string;
    shipped_at?: string;
    delivered_at?: string;
    created_at: string;
    items?: Array<{
      product_name: string;
      size: string;
      color: string;
      quantity: number;
      unit_price: number;
      total_price: number;
      custom_name?: string;
      custom_number?: string;
    }>;
  };
}

export async function trackGuestOrder(
  orderNumber: string,
  options?: {
    phone?: string;
    guestAccessToken?: string;
    clientIp?: string;
  }
): Promise<GuestTrackingResult> {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase.rpc('track_guest_order', {
    p_order_number: orderNumber.trim(),
    p_phone: options?.phone?.trim() || null,
    p_guest_access_token: options?.guestAccessToken?.trim() || null,
    p_client_ip: options?.clientIp?.trim() || null,
  });

  if (error) {
    return {
      success: false,
      message: error.message || 'Tracking request failed',
    };
  }

  return data as GuestTrackingResult;
}
