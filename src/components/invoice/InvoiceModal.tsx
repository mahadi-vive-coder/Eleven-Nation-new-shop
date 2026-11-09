import React, { useEffect } from 'react';
import { X, Printer, ExternalLink, Download } from 'lucide-react';
import { Order } from '../../types';
import { OrderInvoice } from './OrderInvoice';
import { Link } from 'react-router-dom';
import { downloadInvoicePdf } from '../../lib/invoicePdf';

interface InvoiceModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  order,
  isOpen,
  onClose,
  autoPrint = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);

      if (autoPrint) {
        const timer = setTimeout(() => {
          window.print();
        }, 350);
        return () => clearTimeout(timer);
      }
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, autoPrint]);

  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#171717]/75 backdrop-blur-xs transition-opacity no-print"
        onClick={onClose}
      />

      {/* Container */}
      <div className="relative min-h-screen flex flex-col items-center justify-start p-2 sm:p-6 md:p-10 z-10">
        {/* Floating Controls Bar (no-print) */}
        <div className="w-full max-w-[210mm] mb-4 flex items-center justify-between gap-3 bg-[#171717] text-[#F5F3EE] px-4 py-2.5 rounded-full border border-white/20 shadow-xl no-print">
          <div className="flex items-center gap-2 text-xs font-display font-bold uppercase tracking-wider">
            <span className="text-[#8A927A]">ELEVEN NATION</span>
            <span className="text-white/40">/</span>
            <span className="text-white truncate">Invoice {order.orderNumber}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadInvoicePdf(order)}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5 text-[#D8BC85]" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-full bg-[#8A927A] hover:bg-[#788069] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Print A4 Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Invoice</span>
            </button>

            <Link
              to={`/invoice/${order.orderNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1 text-[11px] text-[#D8BC85] hover:underline px-2 py-1 font-semibold uppercase tracking-wider"
              title="Open standalone invoice page"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ml-1"
              aria-label="Close invoice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Exact Invoice Sheet */}
        <div className="w-full flex justify-center">
          <OrderInvoice order={order} />
        </div>
      </div>
    </div>
  );
};
