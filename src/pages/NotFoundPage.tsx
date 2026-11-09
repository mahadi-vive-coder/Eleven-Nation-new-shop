import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Compass } from 'lucide-react';
import { BrandLogo } from '../components/common/BrandLogo';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-20 text-center">
      <div className="max-w-md w-full space-y-6">
        <BrandLogo size="md" className="mx-auto justify-center" />
        <div className="space-y-2">
          <span className="text-6xl sm:text-7xl font-display font-black text-[#171717] tracking-tight block">
            404
          </span>
          <h1 className="text-xl sm:text-2xl font-display font-bold uppercase tracking-wider text-[#171717]">
            Page Out of Bounds
          </h1>
          <p className="text-xs sm:text-sm text-[#77746D] leading-relaxed">
            The page or kit drop you are searching for does not exist, has relocated, or is no longer available.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors shadow-2xs"
          >
            Return to Homepage
          </Link>
          <Link
            to="/shop"
            className="w-full sm:w-auto px-6 py-3.5 rounded-full border border-[#D8D4CA] bg-white text-[#171717] text-xs font-bold uppercase tracking-widest hover:border-[#171717] hover:bg-[#F5F3EE] transition-all flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <span>Explore Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
