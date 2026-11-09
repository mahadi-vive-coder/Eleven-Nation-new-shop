import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, CheckCircle2, Package, MapPin, AlertCircle, FileText } from 'lucide-react';
import { orderService } from '../services/orderService';
import { Order, OrderStatus } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';

export const OrderTrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showInvoice, setShowInvoice] = useState(false);

  // Auto-track if params are present in URL
  useEffect(() => {
    const qOrder = searchParams.get('orderNumber');
    const qPhone = searchParams.get('phone');
    if (qOrder) {
      setOrderNumber(qOrder);
      if (qPhone) setPhone(qPhone);
      handleTrack(qOrder, qPhone || '');
    }
  }, [searchParams]);

  const handleTrack = async (orderNumToSearch = orderNumber, phoneToSearch = phone) => {
    if (!orderNumToSearch.trim()) {
      setError('Please enter your order reference number.');
      return;
    }

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await orderService.trackOrder(orderNumToSearch, phoneToSearch);
      if (res.order) {
        setOrder(res.order);
      } else {
        setError(res.error || 'No matching order found.');
      }
    } catch {
      setError('Unable to track order right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-[#42634B]/10 text-[#42634B] border-[#42634B]/30';
      case 'Shipped':
        return 'bg-[#171717]/10 text-[#171717] border-[#171717]/30';
      case 'Processing':
      case 'Confirmed':
        return 'bg-[#8A927A]/15 text-[#5F6751] border-[#8A927A]/40';
      case 'Cancelled':
      case 'Returned':
        return 'bg-[#8B2E2E]/10 text-[#8B2E2E] border-[#8B2E2E]/30';
      case 'Pending':
      default:
        return 'bg-[#F5F3EE] text-[#77746D] border-[#D8D4CA]';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-10 h-1 bg-[#8A927A] rounded-full mx-auto mb-3" />
        <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
          Real-time Dispatch
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-black uppercase text-[#171717] tracking-tight">
          Track Your Order
        </h1>
        <p className="text-xs sm:text-sm text-[#77746D] max-w-md mx-auto leading-relaxed">
          Enter your Eleven Nation order reference number and contact number to view live consignment progress.
        </p>
      </div>

      {/* Tracking Input Card */}
      <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 shadow-2xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleTrack();
          }}
          className="grid grid-cols-1 sm:grid-cols-12 gap-3"
        >
          <div className="sm:col-span-5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Order Reference *
            </label>
            <input
              type="text"
              required
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="e.g. EN-10001"
              className="w-full px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div className="sm:col-span-4">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#171717] mb-1.5">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="017XXXXXXXX"
              className="w-full px-4 py-2.5 rounded-xl text-xs border border-[#D8D4CA] bg-[#F5F3EE] focus:outline-none focus:border-[#171717]"
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-6 rounded-full bg-[#171717] text-[#F5F3EE] text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs h-[42px]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Track</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-[#8B2E2E]/10 border border-[#8B2E2E]/30 rounded-xl text-[#8B2E2E] text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Order Tracking Result View */}
      {order && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Header Summary */}
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#77746D]">
                Shipment Record
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-mono text-[#171717] mt-0.5">
                {order.orderNumber}
              </h2>
              <p className="text-xs text-[#77746D] mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="flex flex-col sm:items-end gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
                <button
                  type="button"
                  onClick={() => setShowInvoice(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-[#F5F3EE] hover:bg-[#171717] hover:text-white text-[#171717] border border-[#D8D4CA] transition-all cursor-pointer shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#8A927A]" />
                  <span>VIEW OFFICIAL INVOICE</span>
                </button>
              </div>
              <span className="text-xs text-[#77746D]">
                Payment: <strong className="text-[#171717]">Cash on Delivery (৳{order.grandTotal.toLocaleString()})</strong>
              </span>
            </div>
          </div>

          {/* Stepper Timeline */}
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 shadow-2xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] mb-6 font-display">
              Consignment Progress Timeline
            </h3>

            <div className="relative pl-6 sm:pl-8 border-l-2 border-[#D8D4CA] space-y-8">
              {order.timeline.map((step, idx) => (
                <div key={idx} className="relative group">
                  {/* Step icon bullet */}
                  <div
                    className={`absolute -left-[31px] sm:-left-[39px] top-0 w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                      step.completed
                        ? 'bg-[#171717] border-[#171717] text-white'
                        : step.current
                        ? 'bg-[#8A927A] border-[#8A927A] text-white animate-pulse'
                        : 'bg-white border-[#D8D4CA] text-[#B7B2A7]'
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>

                  {/* Step info */}
                  <div className="space-y-1">
                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                      <h4 className={`text-sm font-bold ${step.completed || step.current ? 'text-[#171717]' : 'text-[#77746D]'}`}>
                        {step.label}
                      </h4>
                      <span className="text-[11px] font-mono text-[#77746D]">
                        {step.timestamp}
                      </span>
                    </div>
                    <p className="text-xs text-[#77746D] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Items Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-2 flex items-center gap-1.5 font-display">
                <MapPin className="w-3.5 h-3.5 text-[#8A927A]" />
                <span>Recipient & Address</span>
              </h4>
              <p className="text-xs font-bold text-[#171717]">{order.customerName}</p>
              <p className="text-xs text-[#77746D]">{order.customerPhone}</p>
              <p className="text-xs text-[#77746D] leading-relaxed">{order.deliveryAddress.fullAddress}, {order.deliveryAddress.area}, {order.deliveryAddress.district}</p>
            </div>

            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 space-y-3 shadow-2xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-2 flex items-center gap-1.5 font-display">
                <Package className="w-3.5 h-3.5 text-[#8A927A]" />
                <span>Package Contents ({order.items.length})</span>
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-[#D8D4CA]/50 last:border-b-0">
                    <span className="text-[#171717] truncate max-w-[200px]">
                      {item.quantity}x {item.productName} ({item.size})
                    </span>
                    <span className="font-bold tabular-nums text-[#171717]">৳{item.totalPrice.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Official Invoice Modal */}
          <InvoiceModal
            order={order}
            isOpen={showInvoice}
            onClose={() => setShowInvoice(false)}
          />
        </div>
      )}
    </div>
  );
};
