import { supabase } from './supabase';

export interface CheckoutItemPayload {
  variant_id: string;
  quantity: number;
  custom_name?: string;
  custom_number?: string;
}

export interface PlaceOrderInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  deliveryZone: 'inside_dhaka' | 'outside_dhaka';
  customerNote?: string;
  couponCode?: string;
  items: CheckoutItemPayload[];
  idempotencyKey?: string;
}

export interface PlaceOrderResult {
  success: boolean;
  idempotentReplay?: boolean;
  orderId?: string;
  orderNumber?: string;
  guestAccessToken?: string;
  subtotal?: number;
  deliveryCharge?: number;
  discountAmount?: number;
  total?: number;
  error?: string;
}

/**
 * Places an order using the atomic server-side PostgreSQL function.
 * Ensures zero client-side price tampering, automatic stock deductions, and race-safe idempotency.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  // Generate a random UUID idempotency key if not supplied by the caller
  const idempotencyKey = input.idempotencyKey || `chk_${crypto.randomUUID()}`;

  const { data, error } = await supabase.rpc('place_order_atomic', {
    p_customer_name: input.customerName.trim(),
    p_customer_phone: input.customerPhone.trim(),
    p_customer_email: input.customerEmail?.trim() || null,
    p_shipping_address: input.shippingAddress.trim(),
    p_delivery_zone: input.deliveryZone,
    p_customer_note: input.customerNote?.trim() || null,
    p_coupon_code: input.couponCode?.trim() || null,
    p_items: input.items,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Checkout failed. Please try again.',
    };
  }

  return {
    success: true,
    idempotentReplay: data.idempotent_replay,
    orderId: data.order_id,
    orderNumber: data.order_number,
    guestAccessToken: data.guest_access_token,
    subtotal: data.subtotal,
    deliveryCharge: data.delivery_charge,
    discountAmount: data.discount_amount,
    total: data.total,
  };
}
