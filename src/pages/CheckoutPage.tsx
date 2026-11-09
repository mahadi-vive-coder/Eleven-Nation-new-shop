import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Truck, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { orderService } from '../services/orderService';

export const CheckoutPage: React.FC = () => {
  const { cart, totals, deliveryDistrict, setDeliveryDistrict, clearCart } = useCart();
  const { customer } = useAuth();
  const navigate = useNavigate();

  // Form fields
  const [fullName, setFullName] = useState(customer?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [district, setDistrict] = useState(deliveryDistrict || 'Dhaka');
  const [area, setArea] = useState(customer?.addresses[0]?.area || '');
  const [fullAddress, setFullAddress] = useState(customer?.addresses[0]?.fullAddress || '');
  const [instructions, setInstructions] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

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
    'Jessore',
    'Dinajpur',
    'Brahmanbaria',
    'Tangail',
    'Feni',
    'Noakhali',
    'Pabna',
  ];

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-display font-bold text-[#111111]">Your Shopping Bag is Empty</h2>
        <p className="text-xs text-[#777777]">Add products to your cart before proceeding to checkout.</p>
        <Link
          to="/shop"
          className="inline-block px-8 py-3.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors shadow-2xs"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    setDeliveryDistrict(newDistrict);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Validation
    if (!fullName.trim()) {
      setValidationError('Please enter your full name.');
      return;
    }

    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      setValidationError('Please provide a valid 11-digit Bangladeshi phone number (e.g. 017XXXXXXXX).');
      return;
    }

    if (!area.trim() || !fullAddress.trim()) {
      setValidationError('Please enter your delivery area/thana and complete street address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const order = await orderService.createDemoOrder({
        customerName: fullName.trim(),
        customerPhone: phoneNumber.trim(),
        customerEmail: email.trim() || undefined,
        deliveryAddress: {
          district,
          area: area.trim(),
          fullAddress: fullAddress.trim(),
          instructions: instructions.trim() || undefined,
        },
        items: cart,
        subtotal: totals.subtotal,
        deliveryCharge: totals.deliveryCharge,
        discount: totals.discount,
        grandTotal: totals.grandTotal,
        notes: instructions.trim() || undefined,
      });

      // Clear shopping bag
      clearCart();

      // Navigate to confirmation page
      navigate(`/order-confirmation/${order.orderNumber}`);
    } catch (err) {
      console.error('Order creation error:', err);
      setValidationError('An error occurred while creating your order. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#77746D] hover:text-[#171717]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Shopping Bag</span>
        </Link>
      </div>

      <div className="border-b border-[#D8D4CA] pb-4">
        <h1 className="text-3xl font-display font-black uppercase text-[#171717] tracking-tight">
          Checkout & Delivery
        </h1>
        <p className="text-xs sm:text-sm text-[#77746D] mt-1 font-normal">
          Complete your order with Cash on Delivery anywhere in Bangladesh.
        </p>
      </div>

      {/* Demo notice banner as instructed */}
      <div className="bg-[#FAF8F5] border border-[#D8D4CA] rounded-2xl p-4 text-xs text-[#77746D] flex items-start gap-3 shadow-2xs">
        <AlertCircle className="w-4 h-4 shrink-0 text-[#8A927A] mt-0.5" />
        <div>
          <strong className="font-semibold text-[#171717] uppercase tracking-[0.14em] block">Demo Checkout Mode Active</strong>
          <span className="font-normal leading-relaxed">
            This prototype records your order into local simulation storage. You will receive an authentic Eleven Nation order reference number and tracking timeline. When Supabase is connected in the next phase, this service will automatically save directly to production database tables.
          </span>
        </div>
      </div>

      {validationError && (
        <div className="p-3.5 bg-[#FAF2F2] border border-[#8B2E2E]/40 text-[#8B2E2E] text-xs font-medium rounded-xl">
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmitOrder}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Form: Customer & Delivery Info (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Section 1: Customer Contact */}
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
              <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
                1. Customer Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                    Phone Number (BD) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="For digital invoice and tracking updates..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                />
              </div>
            </div>

            {/* Section 2: Delivery Address */}
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-4 shadow-2xs">
              <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
                2. Shipping & Delivery Address
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                    District *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => handleDistrictChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] focus:outline-none focus:border-[#171717] font-medium"
                  >
                    {districts.map((d) => (
                      <option key={d} value={d}>
                        {d} ({d === 'Dhaka' ? 'Inside Dhaka — ৳70' : 'Outside Dhaka — ৳130'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                    Area / Thana *
                  </label>
                  <input
                    type="text"
                    required
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Dhanmondi, Uttara, Halishahar..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                  Full Street Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={fullAddress}
                  onChange={(e) => setFullAddress(e.target.value)}
                  placeholder="House number, road number, flat number, nearby landmark..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#171717] mb-1">
                  Delivery Instructions (Optional)
                </label>
                <input
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Call before arriving, leave with security..."
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-[#D8D4CA] bg-[#F5F3EE] text-[#171717] placeholder-[#77746D] focus:outline-none focus:border-[#171717]"
                />
              </div>
            </div>

            {/* Section 3: Payment Method */}
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-3 shadow-2xs">
              <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
                3. Payment Method
              </h2>

              <div className="p-4 border-2 border-[#171717] bg-[#F5F3EE] rounded-xl flex items-start gap-3">
                <input
                  type="radio"
                  id="cod"
                  name="paymentMethod"
                  checked={true}
                  readOnly
                  className="mt-1 accent-[#171717]"
                />
                <div>
                  <label htmlFor="cod" className="text-sm font-semibold text-[#171717] cursor-pointer block tracking-wider font-display">
                    CASH ON DELIVERY (COD)
                  </label>
                  <p className="text-xs text-[#77746D] mt-0.5 leading-relaxed font-normal">
                    Pay when your order arrives. Inspect parcel condition at your doorstep before handing payment to courier rider.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary: Items & Total (5 cols) */}
          <div className="lg:col-span-5 bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs lg:sticky lg:top-28">
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-3">
              Order Review ({totals.itemCount} items)
            </h2>

            {/* Itemized list */}
            <div className="max-h-64 overflow-y-auto space-y-3 divide-y divide-[#D8D4CA]/50 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="pt-2 first:pt-0 flex gap-3 items-center">
                  <img
                    src={item.product.images[0]?.url}
                    alt={item.product.name}
                    className="w-14 h-16 object-cover bg-[#F5F3EE] shrink-0 rounded-lg border border-[#D8D4CA]"
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <p className="font-semibold text-[#171717] truncate font-display">{item.product.name}</p>
                    <p className="text-[#77746D] text-[11px]">
                      Size: {item.size} · Qty: {item.quantity}
                    </p>
                    {item.customization && (
                      <p className="text-[10px] text-[#8A927A] font-semibold">
                        {item.customization.name} #{item.customization.number}
                      </p>
                    )}
                  </div>
                  <span className="font-bold text-[#171717] text-xs tabular-nums">
                    ৳{item.totalPrice.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="pt-4 border-t border-[#D8D4CA] space-y-2 text-xs text-[#77746D]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold text-[#171717] tabular-nums">৳{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge ({district})</span>
                <span className="font-semibold text-[#171717] tabular-nums">
                  {totals.deliveryCharge === 0 ? (
                    <span className="text-[#42634B] font-bold">FREE</span>
                  ) : (
                    `৳${totals.deliveryCharge}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-[#171717] pt-3 border-t border-[#D8D4CA] font-display">
                <span>Grand Total</span>
                <span className="tabular-nums">৳{totals.grandTotal.toLocaleString()}</span>
              </div>
              <p className="text-[11px] text-[#77746D] italic text-right font-light">
                All taxes included · Payable in BDT (৳)
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.2em] hover:bg-[#2A2925] disabled:bg-[#D8D4CA] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Placing Order...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#8A927A]" />
                  <span>CONFIRM ORDER</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-[#77746D] text-center space-y-1">
              <div className="flex items-center justify-center gap-1.5 font-medium text-[#171717]">
                <Truck className="w-3.5 h-3.5 text-[#8A927A]" />
                <span>Delivered via Steadfast / Pathao Courier</span>
              </div>
              <p>By confirming your order, you agree to Eleven Nation's Terms & Shipping Policy.</p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
