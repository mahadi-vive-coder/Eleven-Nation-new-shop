import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { CheckCircle, Truck, Package, Clock, Phone, MapPin, ArrowRight, Printer, FileText } from 'lucide-react';
import { orderService } from '../services/orderService';
import { Order } from '../types';
import { InvoiceModal } from '../components/invoice/InvoiceModal';

export const OrderConfirmationPage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [autoPrintInvoice, setAutoPrintInvoice] = useState(false);

  const handleViewInvoice = () => {
    setAutoPrintInvoice(false);
    setIsInvoiceOpen(true);
  };

  const handlePrintInvoice = () => {
    setAutoPrintInvoice(true);
    setIsInvoiceOpen(true);
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) return;
      try {
        const res = await orderService.trackOrder(orderNumber, phone || undefined);
        if (res.order) {
          setOrder(res.order);
        }
      } catch (e) {
        console.error('Failed to load confirmed order', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#171717', '#8A927A', '#F5F3EE', '#77746D'],
      });
    } catch {
      // Ignore
    }
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-display font-bold text-[#171717] tracking-tight">Order Not Found</h2>
        <p className="text-xs text-[#77746D]">
          We couldn't locate order reference #{orderNumber}.
        </p>
        <Link
          to="/shop"
          className="inline-block px-8 py-3.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors shadow-2xs"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-10">
      {/* Success Hero Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-[#171717] text-[#8A927A] rounded-full mx-auto flex items-center justify-center shadow-xs">
          <CheckCircle className="w-8 h-8" />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-[0.25em] text-[#8A927A] block">
          Order Successfully Placed
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-extrabold uppercase text-[#171717] tracking-tight">
          THANK YOU, {order.customerName.toUpperCase()}!
        </h1>
        <p className="text-xs sm:text-sm text-[#77746D] max-w-md mx-auto leading-relaxed">
          Your order has been received. Our support team will place a brief verification call to confirm sizing before dispatching.
        </p>
      </div>

      {/* Main Order Details Card */}
      <div className="bg-white border border-[#D8D4CA] rounded-2xl p-6 sm:p-8 space-y-8 shadow-2xs">
        {/* Order Meta Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8D4CA] pb-6">
          <div>
            <span className="text-[10px] text-[#77746D] uppercase font-bold tracking-widest">Order Reference</span>
            <p className="text-xl sm:text-2xl font-bold font-mono text-[#171717] mt-0.5">
              {order.orderNumber}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-right mr-1">
              <span className="text-[10px] text-[#77746D] uppercase font-bold tracking-widest">Current Status</span>
              <p className="text-xs font-bold uppercase tracking-wider text-[#8A927A] mt-0.5 flex items-center gap-1.5 justify-end">
                <Clock className="w-3.5 h-3.5" />
                <span>{order.status}</span>
              </p>
            </div>

            <button
              onClick={handleViewInvoice}
              className="px-3.5 py-2 rounded-full border border-[#D8D4CA] hover:border-[#171717] text-[#171717] hover:bg-[#F5F3EE] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="View Integrated Invoice"
            >
              <FileText className="w-3.5 h-3.5 text-[#8A927A]" />
              <span>View Invoice</span>
            </button>

            <button
              onClick={handlePrintInvoice}
              className="px-3.5 py-2 rounded-full bg-[#171717] hover:bg-[#2A2A2A] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Print A4 Invoice"
            >
              <Printer className="w-3.5 h-3.5 text-[#D8BC85]" />
              <span>Print Invoice</span>
            </button>
          </div>
        </div>

        {/* Customer & Delivery Summary Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Customer */}
          <div className="p-4 bg-[#F5F3EE] border border-[#D8D4CA] rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77746D] block">
              Customer Information
            </span>
            <p className="text-sm font-bold text-[#171717]">{order.customerName}</p>
            <div className="flex items-center gap-2 text-[#77746D]">
              <Phone className="w-3.5 h-3.5 text-[#8A927A]" />
              <span>{order.customerPhone}</span>
            </div>
            {order.customerEmail && (
              <p className="text-[#77746D]">{order.customerEmail}</p>
            )}
            <p className="pt-1 text-[#77746D] font-medium">
              Payment: <strong className="text-[#171717]">{order.paymentMethod}</strong>
            </p>
          </div>

          {/* Delivery */}
          <div className="p-4 bg-[#F5F3EE] border border-[#D8D4CA] rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#77746D] block">
              Delivery Destination
            </span>
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-[#8A927A] mt-0.5 shrink-0" />
              <div>
                <p className="font-bold text-[#171717]">{order.deliveryAddress.district}, {order.deliveryAddress.area}</p>
                <p className="text-[#77746D] mt-0.5 leading-relaxed">{order.deliveryAddress.fullAddress}</p>
                {order.deliveryAddress.instructions && (
                  <p className="text-[#77746D] italic mt-1">Note: {order.deliveryAddress.instructions}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#171717] border-b border-[#D8D4CA] pb-2 font-display">
            Ordered Products ({order.items.length})
          </h3>

          <div className="divide-y divide-[#D8D4CA]">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <img
                    src={item.productImage}
                    alt={item.productName}
                    className="w-12 h-14 object-cover bg-[#F5F3EE] shrink-0 border border-[#D8D4CA] rounded-lg"
                  />
                  <div>
                    <p className="font-bold text-[#171717]">{item.productName}</p>
                    <p className="text-[#77746D] text-[11px]">
                      Size: {item.size} · Color: {item.color} · Qty: {item.quantity}
                    </p>
                    {item.customization && (
                      <p className="text-[10px] text-[#8A927A] font-bold tracking-wider">
                        PRINT: {item.customization.name} #{item.customization.number}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-[#171717] tabular-nums">৳{item.totalPrice.toLocaleString()}</p>
                  <p className="text-[10px] text-[#77746D]">৳{item.unitPrice} each</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Totals Breakdown */}
        <div className="pt-4 border-t border-[#D8D4CA] space-y-2 text-xs max-w-xs ml-auto">
          <div className="flex justify-between text-[#77746D]">
            <span>Subtotal</span>
            <span className="font-bold text-[#171717] tabular-nums">৳{order.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-[#77746D]">
            <span>Delivery Charge</span>
            <span className="font-bold text-[#171717] tabular-nums">
              {order.deliveryCharge === 0 ? 'FREE' : `৳${order.deliveryCharge}`}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold text-[#171717] pt-2 border-t border-[#D8D4CA] font-display">
            <span>Total Payable (COD)</span>
            <span className="tabular-nums">৳{order.grandTotal.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 pt-4">
        <button
          onClick={handleViewInvoice}
          className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#1E2618] text-[#F7F4EC] text-xs font-bold uppercase tracking-widest hover:bg-[#2B3527] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <FileText className="w-4 h-4 text-[#D8BC85]" />
          <span>VIEW INVOICE</span>
        </button>

        <button
          onClick={handlePrintInvoice}
          className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs font-bold uppercase tracking-widest hover:border-[#171717] hover:bg-[#F5F3EE] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <Printer className="w-4 h-4 text-[#8A927A]" />
          <span>PRINT INVOICE</span>
        </button>

        <Link
          to={`/track-order?orderNumber=${order.orderNumber}&phone=${order.customerPhone}`}
          className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs font-bold uppercase tracking-widest hover:border-[#171717] hover:bg-[#F5F3EE] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <Truck className="w-4 h-4 text-[#8A927A]" />
          <span>Track Order Status</span>
        </Link>

        <Link
          to="/shop"
          className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <span>Continue Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Standalone / Modal Integrated Invoice */}
      <InvoiceModal
        order={order}
        isOpen={isInvoiceOpen}
        onClose={() => setIsInvoiceOpen(false)}
        autoPrint={autoPrintInvoice}
      />
    </div>
  );
};
