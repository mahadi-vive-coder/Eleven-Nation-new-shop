import React from 'react';
import { Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TopAnnouncementBar: React.FC = () => {
  return (
    <div className="relative z-40 bg-[#F5F3EE] text-[#171717] py-2 px-4 text-xs border-b border-[#D8D4CA] select-none font-sans">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left info icons */}
        <div className="flex items-center gap-4 text-xs text-[#171717] overflow-x-auto">
          <div className="inline-flex items-center gap-2 font-medium tracking-tight whitespace-nowrap">
            <Truck className="w-3.5 h-3.5 text-[#171717] shrink-0" />
            <span className="text-[11px] sm:text-xs">Free delivery on orders over ৳2,500 within Bangladesh</span>
          </div>
          <span className="hidden md:inline text-[#D8D4CA]" aria-hidden="true">|</span>
          <div className="hidden md:inline-flex items-center gap-2 text-[#77746D] whitespace-nowrap">
            <ShieldCheck className="w-3.5 h-3.5 text-[#8A927A] shrink-0" />
            <span className="text-[11px] sm:text-xs text-[#171717]">Cash on Delivery Available</span>
          </div>
        </div>

        {/* Right utility links: Track Order | Help | Contact */}
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-[#77746D] font-medium shrink-0">
          <Link to="/track-order" className="hover:text-[#171717] transition-colors">
            Track Order
          </Link>
          <span className="text-[#D8D4CA]" aria-hidden="true">|</span>
          <Link to="/faq" className="hover:text-[#171717] transition-colors">
            Help
          </Link>
          <span className="text-[#D8D4CA]" aria-hidden="true">|</span>
          <Link to="/contact" className="hover:text-[#171717] transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
};
