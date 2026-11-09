import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export const CartPage: React.FC = () => {
  const { cart, totals, updateQuantity, removeFromCart, deliveryDistrict, setDeliveryDistrict } = useCart();
  const navigate = useNavigate();

  const districts = [
    'Dhaka',
    'Chattogram',
    'Sylhet',
    'Gazipur',
    'Narayanganj',
    'Rajshahi',
    'Khulna',
    'Barishal',
    'Rangpur',
    'Mymensingh',
    'Cumilla',
    'Bogura',
    'Cox\'s Bazar',
  ];

  if (cart.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-[#D8D4CA]/40 rounded-full mx-auto flex items-center justify-center text-[#77746D]">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-black uppercase text-[#171717]">
            Your Bag is Empty
          </h1>
          <p className="text-sm text-[#77746D] mt-2 max-w-sm mx-auto font-normal">
            You haven't added any casual pieces or jerseys to your shopping bag yet.
          </p>
        </div>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2925] transition-colors shadow-2xs"
        >
          <span>Explore Catalog</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-[#D8D4CA] pb-4">
        <h1 className="text-3xl font-display font-black uppercase text-[#171717] tracking-tight">
          Shopping Bag ({totals.itemCount} items)
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Items Table / Cards (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {cart.map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row gap-4 p-4 sm:p-5 bg-white border border-[#D8D4CA] rounded-2xl shadow-2xs items-start sm:items-center justify-between"
            >
              <div className="flex gap-4 items-center">
                <Link to={`/product/${item.product.slug}`} className="w-20 h-24 bg-[#F5F3EE] rounded-xl overflow-hidden shrink-0 border border-[#D8D4CA]">
                  <img
                    src={item.product.images[0]?.url}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </Link>

                <div className="space-y-1">
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="text-sm sm:text-base font-semibold text-[#171717] hover:text-[#8A927A] transition-colors line-clamp-1 font-display"
                  >
                    {item.product.name}
                  </Link>
                  <p className="text-xs text-[#77746D]">
                    Size: <strong className="text-[#171717]">{item.size}</strong> · Color: {item.color}
                  </p>

                  {item.customization && (
                    <p className="text-xs font-medium text-[#171717] bg-[#F5F3EE] px-2.5 py-0.5 border border-[#D8D4CA] rounded-full inline-block">
                      <span className="text-[#8A927A] font-bold">CUSTOM:</span> {item.customization.name} #{item.customization.number} (+৳{item.customization.price})
                    </p>
                  )}

                  <p className="text-xs text-[#77746D] font-mono">
                    Unit Price: ৳{item.unitPrice.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-[#D8D4CA]">
                {/* Quantity */}
                <div className="flex items-center border border-[#D8D4CA] bg-[#F5F3EE] rounded-full px-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="px-2.5 py-1.5 text-xs text-[#171717] hover:text-[#8A927A] cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="px-3 text-xs font-semibold tabular-nums text-[#171717]">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="px-2.5 py-1.5 text-xs text-[#171717] hover:text-[#8A927A] cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-right">
                  <span className="text-base font-bold text-[#171717] tabular-nums">
                    ৳{item.totalPrice.toLocaleString()}
                  </span>
                </div>

                {/* Delete */}
                <button
                  onClick={() => removeFromCart(item.id)}
                  className="text-[#77746D] hover:text-[#8B2E2E] p-1.5 transition-colors cursor-pointer"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between items-center pt-2">
            <Link
              to="/shop"
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[#171717] hover:text-[#8A927A]"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right: Summary Box (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
          <h2 className="text-base font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
            Order Summary
          </h2>

          {/* Delivery destination calculator */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[#77746D] uppercase tracking-[0.16em]">
              Delivery Destination:
            </label>
            <select
              value={deliveryDistrict}
              onChange={(e) => setDeliveryDistrict(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] font-medium focus:outline-none focus:border-[#171717]"
            >
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d} {d === 'Dhaka' ? '(Inside Dhaka - ৳70)' : '(Outside Dhaka - ৳130)'}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 text-xs text-[#77746D]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-semibold text-[#171717] tabular-nums">৳{totals.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Delivery Fee</span>
              <span className="font-semibold text-[#171717] tabular-nums">
                {totals.deliveryCharge === 0 ? (
                  <span className="text-[#42634B] font-bold">FREE (Over ৳2,500)</span>
                ) : (
                  `৳${totals.deliveryCharge}`
                )}
              </span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-[#42634B]">
                <span>Discount</span>
                <span className="font-semibold tabular-nums">-৳{totals.discount}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-[#171717] pt-3 border-t border-[#D8D4CA] font-display">
              <span>Estimated Total</span>
              <span className="tabular-nums">৳{totals.grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full py-3.5 px-6 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2925] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-xs text-[#77746D]">
            <ShieldCheck className="w-4 h-4 text-[#8A927A] shrink-0" />
            <span>Cash on Delivery available on all orders in Bangladesh.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
