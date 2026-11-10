import { Order, CartItem, OrderStatus, OrderTimelineStep } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { placeOrder } from '../lib/checkout';
import { trackGuestOrder } from '../lib/guestTracking';

const ORDERS_STORAGE_KEY = 'eleven_nation_orders_v1';

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    district: string;
    area: string;
    fullAddress: string;
    instructions?: string;
  };
  items: CartItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  notes?: string;
  couponCode?: string;
}

function generateTimeline(
  statusStr: string,
  createdAtStr: string,
  shippedAtStr?: string,
  deliveredAtStr?: string
): OrderTimelineStep[] {
  const normStatus = statusStr.toLowerCase();
  const createdDate = new Date(createdAtStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const isConfirmed = ['confirmed', 'processing', 'shipped', 'delivered'].includes(normStatus);
  const isProcessing = ['processing', 'shipped', 'delivered'].includes(normStatus);
  const isShipped = ['shipped', 'delivered'].includes(normStatus);
  const isDelivered = normStatus === 'delivered';

  return [
    {
      status: 'Pending',
      label: 'Order Received',
      timestamp: createdDate,
      description: 'Order placed via Cash on Delivery. Verification pending.',
      completed: true,
      current: normStatus === 'pending',
    },
    {
      status: 'Confirmed',
      label: 'Phone Verification',
      timestamp: isConfirmed ? 'Verified' : 'Pending verification call',
      description: 'Customer contact and sizing confirmed.',
      completed: isConfirmed,
      current: normStatus === 'confirmed',
    },
    {
      status: 'Processing',
      label: 'Packing & Quality Control',
      timestamp: isProcessing ? 'Completed' : 'Estimated 24h',
      description: 'Preparation, customization printing, and inspection.',
      completed: isProcessing,
      current: normStatus === 'processing',
    },
    {
      status: 'Shipped',
      label: 'Handed to Courier',
      timestamp: shippedAtStr ? new Date(shippedAtStr).toLocaleDateString('en-GB') : 'Estimated 2-3 business days',
      description: 'Dispatched via trusted Bangladesh courier service.',
      completed: isShipped,
      current: normStatus === 'shipped',
    },
    {
      status: 'Delivered',
      label: 'Delivered',
      timestamp: deliveredAtStr ? new Date(deliveredAtStr).toLocaleDateString('en-GB') : 'Upon delivery',
      description: 'Payment collected at doorstep.',
      completed: isDelivered,
      current: isDelivered,
    },
  ];
}

function mapDbOrderToOrder(row: any): Order {
  const rawStatus = (row.status || 'pending').toLowerCase();
  const formattedStatus: OrderStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as OrderStatus;

  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email || undefined,
    deliveryAddress: {
      district: row.delivery_zone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
      area: '',
      fullAddress: row.shipping_address,
      instructions: row.customer_note || undefined,
    },
    items: Array.isArray(row.items)
      ? row.items.map((it: any) => ({
          productId: it.product_id || it.variant_id || it.id,
          productName: it.product_name || 'Product',
          productImage: '',
          size: it.size || 'M',
          color: it.color || 'Default',
          variantSku: it.sku || `EN-${it.size}`,
          customization: it.custom_name
            ? {
                name: it.custom_name,
                number: it.custom_number || '',
                price: 0,
              }
            : undefined,
          unitPrice: Number(it.unit_price) || 0,
          quantity: Number(it.quantity) || 1,
          totalPrice: Number(it.total_price) || 0,
        }))
      : [],
    subtotal: Number(row.subtotal) || 0,
    deliveryCharge: Number(row.delivery_charge) || 0,
    discount: Number(row.discount_amount) || 0,
    grandTotal: Number(row.total) || 0,
    paymentMethod: 'Cash on Delivery',
    status: formattedStatus,
    timeline: generateTimeline(rawStatus, row.created_at, row.shipped_at, row.delivered_at),
    createdAt: row.created_at,
    notes: row.customer_note || undefined,
  };
}

export const orderService = {
  getStoredOrders(): Order[] {
    try {
      const stored = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!stored) {
        return [];
      }
      const parsed: Order[] = JSON.parse(stored);
      const realOrders = Array.isArray(parsed)
        ? parsed.filter((o) => o.id !== 'ord-demo-seed-1' && o.orderNumber !== 'EN-28941')
        : [];
      if (realOrders.length !== parsed.length) {
        localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(realOrders));
      }
      return realOrders;
    } catch {
      return [];
    }
  },

  saveOrders(orders: Order[]): void {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Failed to save orders to localStorage', e);
    }
  },

  /**
   * Fetch authenticated customer's order history from PostgreSQL.
   * Never leaks or mixes orders from other customers (enforced by RLS on public.orders).
   */
  async getCustomerOrders(customerId: string): Promise<Order[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('customer_id', customerId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Supabase getCustomerOrders error:', error);
          return [];
        }

        return (data || []).map((row) => mapDbOrderToOrder(row));
      } catch (err) {
        console.error('getCustomerOrders exception:', err);
        return [];
      }
    }

    // Local demo mode fallback
    return this.getStoredOrders();
  },

  /**
   * Submit new Cash on Delivery order.
   * If Supabase is configured: executes atomic server-side checkout via place_order_atomic().
   * If atomic checkout fails on a configured database, throws a descriptive error and never creates fake orders.
   * If Supabase is unconfigured (development demo mode), saves to local browser storage.
   */
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    const isInsideDhaka = payload.deliveryAddress.district.toLowerCase() === 'dhaka';
    const deliveryZone = isInsideDhaka ? 'inside_dhaka' : 'outside_dhaka';
    const fullStreetAddress = `${payload.deliveryAddress.fullAddress}, ${payload.deliveryAddress.area}, ${payload.deliveryAddress.district}`;

    let generatedOrderNumber = `EN-${Math.floor(10000 + Math.random() * 90000)}`;
    let generatedOrderId = `ord-${Date.now()}`;
    let finalSubtotal = payload.subtotal;
    let finalDeliveryCharge = payload.deliveryCharge;
    let finalDiscount = payload.discount;
    let finalGrandTotal = payload.grandTotal;

    if (isSupabaseConfigured) {
      // Map variant ID accurately from cart item (preserving variant UUID)
      const rpcItems = payload.items.map((item) => ({
        variant_id: item.variantId || item.productId,
        quantity: item.quantity,
        custom_name: item.customization?.name,
        custom_number: item.customization?.number,
      }));

      const rpcResult = await placeOrder({
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        customerEmail: payload.customerEmail,
        shippingAddress: fullStreetAddress,
        deliveryZone,
        customerNote: payload.notes || payload.deliveryAddress.instructions,
        couponCode: payload.couponCode,
        items: rpcItems,
      });

      if (rpcResult.success && rpcResult.orderNumber) {
        generatedOrderNumber = rpcResult.orderNumber;
        generatedOrderId = rpcResult.orderId || generatedOrderId;
        finalSubtotal = rpcResult.subtotal ?? finalSubtotal;
        finalDeliveryCharge = rpcResult.deliveryCharge ?? finalDeliveryCharge;
        finalDiscount = rpcResult.discountAmount ?? finalDiscount;
        finalGrandTotal = rpcResult.total ?? finalGrandTotal;
      } else {
        // Strict production requirement: never silently fake an order when database is configured
        throw new Error(rpcResult.error || 'Unable to place order in database. Please check item availability or try again.');
      }
    }

    const nowIso = new Date().toISOString();
    const formattedNow = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const order: Order = {
      id: generatedOrderId,
      orderNumber: generatedOrderNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      deliveryAddress: payload.deliveryAddress,
      items: payload.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || '',
        size: item.size,
        color: item.color,
        variantSku: `${item.product.sku}-${item.size}`,
        customization: item.customization,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
      })),
      subtotal: finalSubtotal,
      deliveryCharge: finalDeliveryCharge,
      discount: finalDiscount,
      grandTotal: finalGrandTotal,
      paymentMethod: 'Cash on Delivery',
      status: 'Pending',
      timeline: [
        {
          status: 'Pending',
          label: 'Order Received',
          timestamp: formattedNow,
          description: 'Order placed via Cash on Delivery. Verification pending.',
          completed: true,
          current: true,
        },
        {
          status: 'Confirmed',
          label: 'Phone Verification',
          timestamp: 'Pending verification call',
          description: 'Our customer support will confirm sizing and address.',
          completed: false,
          current: false,
        },
        {
          status: 'Processing',
          label: 'Packing & Custom Print',
          timestamp: 'Estimated 24h',
          description: 'Preparation, customization, and quality control.',
          completed: false,
          current: false,
        },
        {
          status: 'Shipped',
          label: 'Handed to Courier',
          timestamp: 'Estimated 2-3 business days',
          description: 'Dispatched via trusted Bangladesh courier service.',
          completed: false,
          current: false,
        },
        {
          status: 'Delivered',
          label: 'Delivered',
          timestamp: 'Upon delivery',
          description: 'Payment collected at doorstep.',
          completed: false,
          current: false,
        },
      ],
      createdAt: nowIso,
      notes: payload.notes,
    };

    // Cache locally for offline preview in development mode
    if (!isSupabaseConfigured) {
      const currentOrders = this.getStoredOrders();
      this.saveOrders([order, ...currentOrders]);
    }

    return order;
  },

  // Backwards compatibility alias
  async createDemoOrder(payload: CreateOrderPayload): Promise<Order> {
    return this.createOrder(payload);
  },

  /**
   * Look up order by orderNumber with phone verification or guestAccessToken.
   * When Supabase is configured: queries PostgreSQL track_guest_order() RPC directly.
   * Never falls back to fake local storage orders when connected to Supabase.
   */
  async trackOrder(
    orderNumber: string, 
    phone?: string, 
    guestAccessToken?: string
  ): Promise<{ order: Order | null; error?: string }> {
    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = phone?.trim().replace(/[^0-9]/g, '') || '';
    const cleanToken = guestAccessToken?.trim() || undefined;

    if (isSupabaseConfigured) {
      try {
        const trackingRes = await trackGuestOrder(cleanOrderNumber, {
          phone: cleanPhone || undefined,
          guestAccessToken: cleanToken,
        });

        if (trackingRes.success && trackingRes.order) {
          const o = trackingRes.order;
          const rawStatus = (o.status || 'pending').toLowerCase();
          const formattedStatus: OrderStatus = (rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1)) as OrderStatus;

          const order: Order = {
            id: o.order_number,
            orderNumber: o.order_number,
            customerName: o.customer_name,
            customerPhone: phone || '',
            deliveryAddress: {
              district: o.delivery_zone === 'inside_dhaka' ? 'Dhaka' : 'Outside Dhaka',
              area: '',
              fullAddress: o.delivery_address,
            },
            items: (o.items || []).map((it) => ({
              productId: it.product_name,
              productName: it.product_name,
              productImage: '',
              size: it.size,
              color: it.color,
              variantSku: `${it.product_name}-${it.size}`,
              customization: it.custom_name
                ? {
                    name: it.custom_name,
                    number: it.custom_number || '',
                    price: 0,
                  }
                : undefined,
              unitPrice: Number(it.unit_price) || 0,
              quantity: Number(it.quantity) || 1,
              totalPrice: Number(it.total_price) || 0,
            })),
            subtotal: Number(o.subtotal) || 0,
            deliveryCharge: Number(o.delivery_charge) || 0,
            discount: Number(o.discount_amount) || 0,
            grandTotal: Number(o.total) || 0,
            paymentMethod: 'Cash on Delivery',
            status: formattedStatus,
            timeline: generateTimeline(rawStatus, o.created_at, o.shipped_at, o.delivered_at),
            createdAt: o.created_at,
          };

          return { order };
        }

        // Return real error from database RPC
        return {
          order: null,
          error: trackingRes.message || `No order found with reference "${cleanOrderNumber}".`,
        };
      } catch (err: any) {
        console.error('Database trackOrder error:', err);
        return {
          order: null,
          error: err?.message || 'Database tracking request failed. Please check your connection.',
        };
      }
    }

    // Offline Demo Mode (Only when Supabase environment variables are unset)
    const orders = this.getStoredOrders();
    const matched = orders.find((o) => o.orderNumber.toUpperCase() === cleanOrderNumber);

    if (!matched) {
      return { order: null, error: `No order found with number "${orderNumber}". Please double-check your order number.` };
    }

    if (cleanPhone) {
      const orderPhoneClean = matched.customerPhone.replace(/[^0-9]/g, '');
      if (!orderPhoneClean.endsWith(cleanPhone) && !cleanPhone.endsWith(orderPhoneClean)) {
        return {
          order: null,
          error: 'Phone number does not match this order. Please verify the contact number used during checkout.',
        };
      }
    }

    return { order: matched };
  },

  async getOrderById(id: string): Promise<Order | null> {
    const orders = this.getStoredOrders();
    return orders.find((o) => o.id === id || o.orderNumber === id) || null;
  },
};
