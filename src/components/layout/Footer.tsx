import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../common/BrandLogo';
import { Mail, Phone, MapPin, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#171717] text-[#F5F3EE] border-t border-[#D8D4CA]/20">
      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Column 1: Brand Info & Logo */}
          <div className="lg:col-span-2 space-y-4">
            <BrandLogo size="md" variant="dark" showTagline={true} />
            <p className="text-sm text-[#B7B2A7] leading-relaxed max-w-sm mt-3 font-normal">
              ELEVEN NATION is a premium Bangladeshi lifestyle and football culture brand. We craft elevated casual essentials and authentic football jerseys tailored for true enthusiasts.
            </p>
            <div className="pt-2 text-xs text-[#77746D] space-y-2.5">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-[#8A927A] shrink-0" />
                <span>Dhaka, Bangladesh · Nationwide Express Delivery</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#8A927A] shrink-0" />
                <span>support@elevennation.shop</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#8A927A] shrink-0" />
                <span>+880 1712-345678 (WhatsApp Support)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Shop Collections */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-4 font-display">
              Shop Collections
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#B7B2A7]">
              <li>
                <Link to="/shop" className="hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/casual-clothing" className="hover:text-white transition-colors">
                  Casual Wear
                </Link>
              </li>
              <li>
                <Link to="/football-jerseys" className="hover:text-white transition-colors">
                  Football Jerseys
                </Link>
              </li>
              <li>
                <Link to="/new-arrivals" className="hover:text-white transition-colors">
                  New Arrivals
                </Link>
              </li>
              <li>
                <Link to="/featured" className="hover:text-white transition-colors">
                  Featured Collections
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-4 font-display">
              Customer Service
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#B7B2A7]">
              <li>
                <Link to="/track-order" className="hover:text-white transition-colors">
                  Track Your Order
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-white transition-colors">
                  My Account & Orders
                </Link>
              </li>
              <li>
                <Link to="/shipping-policy" className="hover:text-white transition-colors">
                  Shipping Rates & Delivery
                </Link>
              </li>
              <li>
                <Link to="/returns-policy" className="hover:text-white transition-colors">
                  7-Day Return & Exchange
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ & Size Guide
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Customer Support Helpdesk
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Brand & Legal */}
          <div>
            <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-white mb-4 font-display">
              Brand & Legal
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-[#B7B2A7]">
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Our Brand Story
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy-policy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <a
                  href="https://elevennation.shop"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span>elevennation.shop</span>
                </a>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-[#B7B2A7] shadow-2xs">
              <div className="flex items-center gap-1.5 font-medium text-white mb-1">
                <ShieldCheck className="w-4 h-4 text-[#8A927A]" />
                <span className="uppercase text-[11px] tracking-wider font-semibold">Cash on Delivery (COD)</span>
              </div>
              <p className="text-[11px] text-[#77746D] leading-relaxed">
                Pay with cash or bKash / Nagad when your parcel arrives at your doorstep anywhere in Bangladesh.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Domain */}
        <div className="mt-12 pt-8 border-t border-[#D8D4CA]/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#77746D]">
          <p>© {new Date().getFullYear()} ELEVEN NATION (elevennation.shop). All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
            <Link to="/shipping-policy" className="hover:text-white transition-colors">
              Shipping
            </Link>
            <span className="text-[#8A927A] font-medium">BDT (৳)</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
