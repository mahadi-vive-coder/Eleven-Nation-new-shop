import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, JerseyCustomizationSelection } from '../types';
import { cartService, CartTotals } from '../services/cartService';

interface CartContextType {
  cart: CartItem[];
  totals: CartTotals;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (
    product: Product,
    variantId: string,
    quantity?: number,
    customization?: JerseyCustomizationSelection
  ) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;
  deliveryDistrict: string;
  setDeliveryDistrict: (district: string) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => cartService.getCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [deliveryDistrict, setDeliveryDistrict] = useState<string>('Dhaka');

  const totals = cartService.calculateTotals(cart, deliveryDistrict);

  // Sync with localStorage on any change
  useEffect(() => {
    cartService.saveCart(cart);
  }, [cart]);

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const addToCart = (
    product: Product,
    variantId: string,
    quantity = 1,
    customization?: JerseyCustomizationSelection
  ) => {
    const updated = cartService.addItem(product, variantId, quantity, customization);
    setCart([...updated]);
    setIsCartOpen(true);
  };

  const updateQuantity = (cartItemId: string, quantity: number) => {
    const updated = cartService.updateQuantity(cartItemId, quantity);
    setCart([...updated]);
  };

  const removeFromCart = (cartItemId: string) => {
    const updated = cartService.removeItem(cartItemId);
    setCart([...updated]);
  };

  const clearCart = () => {
    cartService.clearCart();
    setCart([]);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        totals,
        isCartOpen,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        deliveryDistrict,
        setDeliveryDistrict,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
