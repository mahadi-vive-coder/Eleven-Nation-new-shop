import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="space-y-16 py-10 sm:py-16">
      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2">
          <span className="w-8 h-[1px] bg-[#8A927A]" />
          <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
            Our Story & Creed
          </span>
          <span className="w-8 h-[1px] bg-[#8A927A]" />
        </div>

        <h1 className="text-4xl sm:text-6xl font-display font-black uppercase text-[#171717] tracking-tight">
          WEAR YOUR IDENTITY.
        </h1>

        <p className="text-sm sm:text-base text-[#77746D] max-w-2xl mx-auto leading-relaxed">
          ELEVEN NATION was conceived in Dhaka, Bangladesh, with a definitive thesis: 
          true fashion and sporting passion do not exist in separate realms.
        </p>
      </div>

      {/* Narrative Section 1 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-5">
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
              01. The Origin
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold uppercase text-[#171717] tracking-tight">
              FROM MATCHDAY TERRACES TO STREET CORNERS
            </h2>
            <p className="text-sm text-[#77746D] leading-relaxed">
              In Bangladesh, football is not a leisure pastime; it is an electric, community-defining obsession. 
              From midnight Champions League screenings to impassioned World Cup rivalries across tea stalls in Dhaka and Chittagong, football courses through our veins.
            </p>
            <p className="text-sm text-[#77746D] leading-relaxed">
              Yet finding garments that combined authentic match-grade jersey fidelity with uncompromising luxury streetwear was nearly impossible. 
              ELEVEN NATION was founded to fill this void—creating heavy-gauge boxy oversized tees, dense loopback French Terry hoodies, and meticulously constructed football kits tailored for the modern purist.
            </p>
          </div>

          <div className="relative aspect-[4/3] bg-[#171717] overflow-hidden border border-[#D8D4CA] rounded-2xl shadow-2xs">
            <img
              src="https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80"
              alt="Football pitch energy"
              className="w-full h-full object-cover filter brightness-[0.85]"
            />
          </div>
        </div>
      </div>

      {/* Core Brand Pillars */}
      <div className="bg-[#171717] text-[#F5F3EE] py-16 px-4 sm:px-6 lg:px-8 border-y border-[#D8D4CA]/20">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
              Standard of Excellence
            </span>
            <h2 className="text-3xl font-display font-black uppercase text-white tracking-tight">
              THE THREE ELEVEN PILLARS
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 shadow-2xs">
              <Sparkles className="w-8 h-8 text-[#8A927A]" />
              <h3 className="text-lg font-display font-bold uppercase text-white">
                HEAVYWEIGHT INTEGRITY
              </h3>
              <p className="text-xs text-[#B7B2A7] leading-relaxed">
                We refuse flimsy, transparent textiles. Our casual tees start at 260 GSM combed compact cotton; our fleece hoodies reach 400 GSM loopback cotton. Built to drape, hold form, and endure.
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 shadow-2xs">
              <Trophy className="w-8 h-8 text-[#8A927A]" />
              <h3 className="text-lg font-display font-bold uppercase text-white">
                MATCHDAY AUTHENTICITY
              </h3>
              <p className="text-xs text-[#B7B2A7] leading-relaxed">
                Whether recreating iconic treble-winning retro shirts or 2024/25 tournament player editions, we honor official typography, moisture-wicking jacquard textiles, and precision heat-pressed badges.
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 shadow-2xs">
              <ShieldCheck className="w-8 h-8 text-[#8A927A]" />
              <h3 className="text-lg font-display font-bold uppercase text-white">
                BANGLADESH-FIRST SERVICE
              </h3>
              <p className="text-xs text-[#B7B2A7] leading-relaxed">
                Full nationwide Cash on Delivery coverage, 24–48 hour rapid dispatch within Dhaka, direct WhatsApp customer advisory, and fair 7-day size exchange guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Strip */}
      <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
        <h2 className="text-2xl sm:text-3xl font-display font-black uppercase text-[#171717] tracking-tight">
          EXPERIENCE THE DIFFERENCE
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/shop?category=casual"
            className="px-8 py-3.5 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2A2A] transition-colors shadow-2xs flex items-center justify-center gap-2"
          >
            <span>Shop Casual Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/shop?category=jerseys"
            className="px-8 py-3.5 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs font-semibold uppercase tracking-[0.16em] hover:border-[#171717] hover:bg-[#F5F3EE] transition-all shadow-2xs flex items-center justify-center gap-2"
          >
            <span>Shop Football Jerseys</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
