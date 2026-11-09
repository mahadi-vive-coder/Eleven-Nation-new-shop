import { CartItem, Product, JerseyCustomizationSelection } from '../types';

const CART_STORAGE_KEY = 'eleven_nation_cart_v1';

export interface CartTotals {
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  freeDeliveryThreshold: number;
  remainingForFreeDelivery: number;
  discount: number;
  grandTotal: number;
}

export const FREE_DELIVERY_THRESHOLD = 2500;
export const DELIVERY_FEE_DHAKA = 70;
export const DELIVERY_FEE_OUTSIDE_DHAKA = 130;

export const cartService = {
  getCart(): CartItem[] {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  saveCart(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  },

  addItem(
    product: Product,
    variantId: string,
    quantity = 1,
    customization?: JerseyCustomizationSelection
  ): CartItem[] {
    const items = this.getCart();
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) throw new Error('Variant not found');

    const customKey = customization
      ? `-${customization.name}-${customization.number}`
      : '';
    const cartItemId = `${product.id}-${variantId}${customKey}`;

    const customizationPrice = customization?.price || 0;
    const unitPrice = product.basePrice + (variant.priceModifier || 0) + customizationPrice;

    const existingIndex = items.findIndex((i) => i.id === cartItemId);

    if (existingIndex > -1) {
      const existing = items[existingIndex];
      const newQty = existing.quantity + quantity;
      // Cap at available stock
      const cappedQty = Math.min(newQty, variant.stock);
      items[existingIndex] = {
        ...existing,
        quantity: cappedQty,
        totalPrice: unitPrice * cappedQty,
      };
    } else {
      const cappedQty = Math.min(quantity, variant.stock);
      const newItem: CartItem = {
        id: cartItemId,
        productId: product.id,
        product,
        variantId,
        size: variant.size,
        color: variant.colorName,
        quantity: cappedQty,
        unitPrice,
        customization,
        totalPrice: unitPrice * cappedQty,
      };
      items.push(newItem);
    }

    this.saveCart(items);
    return items;
  },

  updateQuantity(cartItemId: string, quantity: number): CartItem[] {
    let items = this.getCart();
    if (quantity <= 0) {
      return this.removeItem(cartItemId);
    }

    items = items.map((item) => {
      if (item.id === cartItemId) {
        const variant = item.product.variants.find((v) => v.id === item.variantId);
        const maxStock = variant ? variant.stock : 99;
        const targetQty = Math.min(quantity, maxStock);
        return {
          ...item,
          quantity: targetQty,
          totalPrice: item.unitPrice * targetQty,
        };
      }
      return item;
    });

    this.saveCart(items);
    return items;
  },

  removeItem(cartItemId: string): CartItem[] {
    const items = this.getCart().filter((i) => i.id !== cartItemId);
    this.saveCart(items);
    return items;
  },

  clearCart(): void {
    localStorage.removeItem(CART_STORAGE_KEY);
  },

  calculateTotals(items: CartItem[], district: string = 'Dhaka', couponDiscount = 0): CartTotals {
    const itemCount = items.reduce((acc, curr) => acc + curr.quantity, 0);
    const subtotal = items.reduce((acc, curr) => acc + curr.totalPrice, 0);

    const isDhaka = district.trim().toLowerCase().includes('dhaka');
    const standardFee = isDhaka ? DELIVERY_FEE_DHAKA : DELIVERY_FEE_OUTSIDE_DHAKA;

    const deliveryCharge = (subtotal >= FREE_DELIVERY_THRESHOLD || subtotal === 0) ? 0 : standardFee;
    const remainingForFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
    const discount = Math.min(subtotal, couponDiscount);
    const grandTotal = Math.max(0, subtotal + deliveryCharge - discount);

    return {
      itemCount,
      subtotal,
      deliveryCharge,
      freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
      remainingForFreeDelivery,
      discount,
      grandTotal,
    };
  }
};
