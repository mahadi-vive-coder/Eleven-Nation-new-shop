import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft, CheckCircle2, AlertCircle, Download } from 'lucide-react';
import { orderService } from '../services/orderService';
import { Order } from '../types';
import { OrderInvoice } from '../components/invoice/OrderInvoice';
import { downloadInvoicePdf } from '../lib/invoicePdf';

export const InvoicePage: React.FC = () => {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const shouldAutoPrint = searchParams.get('print') === 'true';

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderNumber) {
        setLoading(false);
        return;
      }

      try {
        const res = await orderService.trackOrder(orderNumber);
        if (res.order) {
          setOrder(res.order);
        } else {
          // Fallback search in all stored orders
          const all = orderService.getStoredOrders();
          const match = all.find(
            (o) =>
              o.orderNumber.toUpperCase() === orderNumber.toUpperCase() ||
              o.id === orderNumber
          );
          if (match) setOrder(match);
        }
      } catch (err) {
        console.error('Failed to load order for invoice', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderNumber]);

  useEffect(() => {
    if (order && shouldAutoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [order, shouldAutoPrint]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#EDE8DE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#77746D]">
            Generating Official Invoice...
          </span>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#EDE8DE] p-4">
        <div className="max-w-md w-full bg-white border border-[#D8D4CA] rounded-2xl p-8 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-[#8B2E2E] mx-auto" />
          <h1 className="text-2xl font-display font-bold uppercase text-[#171717]">
            Invoice Not Found
          </h1>
          <p className="text-xs text-[#77746D] leading-relaxed">
            We could not locate an invoice for order #{orderNumber}. Please check the order reference number or contact customer care.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to="/orders"
              className="px-6 py-2.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors"
            >
              My Orders
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 rounded-full border border-[#D8D4CA] text-[#171717] text-xs font-bold uppercase tracking-widest hover:bg-[#F5F3EE] transition-colors"
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#EDE8DE] py-6 sm:py-10 px-3 sm:px-6">
      {/* Top Controls Bar (hidden during print) */}
      <div className="max-w-[210mm] mx-auto mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 backdrop-blur-md border border-[#D8D4CA] px-5 py-3 rounded-2xl shadow-sm no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full border border-[#D8D4CA] text-[#77746D] hover:text-[#171717] hover:border-[#171717] transition-colors cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8A927A] block">
              Official Tax Receipt
            </span>
            <span className="text-xs font-bold font-display uppercase text-[#171717]">
              Order #{order.orderNumber}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Link
            to={`/order-confirmation/${order.orderNumber}`}
            className="text-xs font-semibold text-[#77746D] hover:text-[#171717] px-3 py-1.5 transition-colors"
          >
            Order Details
          </Link>

          <button
            onClick={() => downloadInvoicePdf(order)}
            className="px-5 py-2.5 rounded-full border border-[#D8D4CA] hover:border-[#171717] bg-white text-[#171717] text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
            title="Download Official PDF Invoice"
          >
            <Download className="w-4 h-4 text-[#8A927A]" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-6 py-2.5 rounded-full bg-[#171717] hover:bg-[#2B3527] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4 text-[#D8BC85]" />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      {/* Standalone A4 Sheet Container */}
      <div className="w-full flex justify-center">
        <OrderInvoice order={order} />
      </div>
    </div>
  );
};
