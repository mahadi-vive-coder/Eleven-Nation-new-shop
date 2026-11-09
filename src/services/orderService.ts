import { Order, CartItem } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
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
   * Submit new Cash on Delivery order.
   * If Supabase is configured, executes atomic server-side checkout via place_order_atomic().
   * Otherwise falls back safely to browser state.
   */
  async createDemoOrder(payload: CreateOrderPayload): Promise<Order> {
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
      // Prepare payload items for database RPC
      const rpcItems = payload.items.map((item) => ({
        variant_id: item.productId, // In full catalog, item.variantId or item.productId
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

    const currentOrders = this.getStoredOrders();
    const updated = [order, ...currentOrders];
    this.saveOrders(updated);

    return order;
  },

  /**
   * Look up order by orderNumber with phone verification or guestAccessToken
   */
  async trackOrder(
    orderNumber: string, 
    phone?: string, 
    guestAccessToken?: string
  ): Promise<{ order: Order | null; error?: string }> {
    const cleanOrderNumber = orderNumber.trim().toUpperCase();
    const cleanPhone = phone?.trim().replace(/[^0-9]/g, '') || '';
    const cleanToken = guestAccessToken?.trim() || undefined;

    // If Supabase is active, execute server-side rate-limited guest order tracking
    if (isSupabaseConfigured && (cleanPhone || cleanToken)) {
      try {
        const trackingRes = await trackGuestOrder(cleanOrderNumber, {
          phone: cleanPhone || undefined,
          guestAccessToken: cleanToken,
          clientIp: '127.0.0.1',
        });
        if (trackingRes.success && trackingRes.order) {
          const matchedOrder = this.getStoredOrders().find((o) => o.orderNumber.toUpperCase() === cleanOrderNumber);
          if (matchedOrder) {
            return {
              order: {
                ...matchedOrder,
                status: (trackingRes.order.status.charAt(0).toUpperCase() + trackingRes.order.status.slice(1)) as any,
              },
            };
          }
        } else if (trackingRes.message) {
          return { order: null, error: trackingRes.message };
        }
      } catch (err) {
        console.warn('Database trackOrder error:', err);
      }
    }

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
