import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, ShieldCheck } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';

export const CartDrawer: React.FC = () => {
  const { cart, totals, isCartOpen, closeCart, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const progressPercent = Math.min(100, Math.round((totals.subtotal / totals.freeDeliveryThreshold) * 100));

  const handleCheckout = () => {
    closeCart();
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeCart}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F5F3EE] shadow-2xl flex flex-col border-l border-[#D8D4CA]">
          {/* Drawer Header */}
          <div className="p-4 sm:p-5 border-b border-[#D8D4CA] bg-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#171717]" />
              <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#171717]">
                Shopping Bag
              </h2>
              <span className="text-xs font-semibold text-[#77746D] tabular-nums">
                ({totals.itemCount} {totals.itemCount === 1 ? 'item' : 'items'})
              </span>
            </div>
            <button
              onClick={closeCart}
              className="p-1.5 text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE] rounded-full transition-colors cursor-pointer"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Shipping Progress Strip */}
          <div className="bg-[#171717] text-[#F5F3EE] px-4 py-3 text-xs">
            {totals.remainingForFreeDelivery > 0 ? (
              <div>
                <p className="flex justify-between font-medium mb-1.5 text-[#B7B2A7]">
                  <span>Add ৳{totals.remainingForFreeDelivery.toLocaleString()} for Free Delivery</span>
                  <span className="text-[#8A927A] font-semibold">{progressPercent}%</span>
                </p>
                <div className="w-full bg-white/20 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="bg-[#8A927A] h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="font-semibold text-[#8A927A] flex items-center gap-1.5">
                <span>✓</span>
                <span>You unlocked FREE delivery across Bangladesh!</span>
              </p>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-[#D8D4CA]/40 flex items-center justify-center text-[#77746D]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#171717] font-display uppercase tracking-wider">Your bag is empty</h3>
                  <p className="text-xs text-[#77746D] mt-1 max-w-xs leading-relaxed">
                    Explore our latest heavyweight casual drops and authentic football jerseys.
                  </p>
                </div>
                <button
                  onClick={() => {
                    closeCart();
                    navigate('/shop');
                  }}
                  className="px-6 py-3 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2925] transition-colors cursor-pointer shadow-2xs"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 p-3.5 bg-white border border-[#D8D4CA] rounded-2xl shadow-2xs relative"
                >
                  {/* Thumbnail */}
                  <Link
                    to={`/product/${item.product.slug}`}
                    onClick={closeCart}
                    className="w-20 h-24 shrink-0 bg-[#F5F3EE] rounded-xl overflow-hidden"
                  >
                    <img
                      src={item.product.images[0]?.url}
                      alt={item.product.name}
                      className="w-full h-full object-cover object-center"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/product/${item.product.slug}`}
                          onClick={closeCart}
                          className="text-xs sm:text-sm font-semibold text-[#171717] hover:text-[#8A927A] transition-colors line-clamp-1 font-display"
                        >
                          {item.product.name}
                        </Link>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-[#77746D] hover:text-[#8B2E2E] p-1 transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-[11px] text-[#77746D] mt-0.5 space-x-2">
                        <span>Size: <strong className="text-[#171717]">{item.size}</strong></span>
                        <span>·</span>
                        <span>{item.color}</span>
                      </div>

                      {/* Custom Jersey Name & Number Callout */}
                      {item.customization && (
                        <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 bg-[#F5F3EE] border border-[#D8D4CA] rounded-full text-[10px] font-medium text-[#171717]">
                          <span className="text-[#8A927A] font-bold">CUSTOM:</span>
                          <span>{item.customization.name} #{item.customization.number}</span>
                          <span className="text-[#77746D]">(+৳{item.customization.price})</span>
                        </div>
                      )}
                    </div>

                    {/* Quantity & Item Subtotal */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center border border-[#D8D4CA] bg-[#F5F3EE] rounded-full px-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1 text-[#171717] hover:text-[#8A927A] cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-2.5 text-xs font-semibold tabular-nums text-[#171717]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1 text-[#171717] hover:text-[#8A927A] cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right">
                        <span className="text-xs sm:text-sm font-bold text-[#171717] tabular-nums">
                          ৳{item.totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer: Totals & Checkout */}
          {cart.length > 0 && (
            <div className="p-4 sm:p-5 bg-white border-t border-[#D8D4CA] space-y-3">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#77746D]">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#171717] tabular-nums">
                    ৳{totals.subtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-[#77746D]">
                  <span>Estimated Delivery (BD)</span>
                  <span className="font-semibold text-[#171717] tabular-nums">
                    {totals.deliveryCharge === 0 ? (
                      <span className="text-[#42634B] font-bold">FREE</span>
                    ) : (
                      `৳${totals.deliveryCharge}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base font-bold text-[#171717] pt-2 border-t border-[#D8D4CA]">
                  <span>Total Amount</span>
                  <span className="tabular-nums">৳{totals.grandTotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={handleCheckout}
                  className="w-full py-3.5 px-6 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2925] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#77746D]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#8A927A]" />
                  <span>Cash on Delivery (COD) · Inspect before pay</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
