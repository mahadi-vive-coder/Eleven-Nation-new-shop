import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Truck, RefreshCw, Sparkles } from 'lucide-react';
import { ProductCard } from '../components/common/ProductCard';
import { HeroBannerSlider } from '../components/banner/HeroBannerSlider';
import { productService } from '../services/productService';
import { bannerService } from '../services/bannerService';
import { categoryService } from '../services/categoryService';
import { Product, Banner, CategoryCard } from '../types';

export const HomePage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categoryCards, setCategoryCards] = useState<CategoryCard[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [casualCampaign, setCasualCampaign] = useState<any>(null);
  const [footballCampaign, setFootballCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [activeBanners, cards, arrivals, popular, casualCamp, footCamp] = await Promise.all([
          bannerService.getActiveBanners(),
          categoryService.getHomepageCategoryCards(),
          productService.getNewArrivals(4),
          productService.getBestSellers(4),
          bannerService.getCasualCampaign(),
          bannerService.getFootballCampaign(),
        ]);

        setBanners(activeBanners);
        setCategoryCards(cards);
        setNewArrivals(arrivals);
        setBestSellers(popular);
        setCasualCampaign(casualCamp);
        setFootballCampaign(footCamp);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    };

    loadHomeData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F5F3EE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#77746D]">
            Loading Eleven Nation...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 sm:space-y-20 pb-16">
      {/* SECTION 1 — HERO BANNER SLIDER FRAMED IN CONTAINER MATCHING REFERENCE SCREENSHOT */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <HeroBannerSlider banners={banners} />
      </section>

      {/* Trust & Guarantee Value Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 py-6 px-6 bg-white border border-[#D8D4CA] rounded-2xl shadow-2xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#8A927A] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">Cash on Delivery</p>
              <p className="text-[11px] text-[#77746D]">Pay upon receipt nationwide</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-[#8A927A] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">Express Delivery</p>
              <p className="text-[11px] text-[#77746D]">Dhaka 24-48h · BD 2-4 days</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#8A927A] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">7-Day Size Exchange</p>
              <p className="text-[11px] text-[#77746D]">Hassle-free replacement</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#8A927A] shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">Premium Quality</p>
              <p className="text-[11px] text-[#77746D]">Heavyweight cotton & authentic kits</p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2 — SHOP BY CATEGORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#D8D4CA] pb-4">
          <div>
            <div className="w-10 h-1 bg-[#8A927A] rounded-full mb-3" />
            <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-[#171717]">
              Shop By Category
            </h2>
          </div>
          <p className="text-xs text-[#77746D] max-w-xs font-normal">
            Tailored essentials engineered for everyday expression and pitch passion.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {categoryCards.map((card) => (
            <div
              key={card.id}
              className="group relative h-[420px] sm:h-[480px] overflow-hidden bg-[#171717] border border-[#D8D4CA] rounded-2xl shadow-2xs flex flex-col justify-end p-6 sm:p-10"
            >
              {/* Background Image */}
              <img
                src={card.imageUrl}
                alt={card.title}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.78] transition-transform duration-700 ease-out group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

              {/* Tag */}
              <div className="relative z-10 mb-auto">
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] bg-white text-[#171717] px-3 py-1 rounded-full shadow-2xs">
                  {card.tag}
                </span>
              </div>

              {/* Copy */}
              <div className="relative z-10 space-y-2">
                <span className="text-xs uppercase tracking-[0.2em] font-medium text-[#8A927A]">
                  {card.subtitle}
                </span>
                <h3 className="text-2xl sm:text-3xl font-display font-black uppercase text-white tracking-tight">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#B7B2A7] max-w-sm font-light">
                  {card.description}
                </p>

                <div className="pt-3">
                  <Link
                    to={card.ctaLink}
                    className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white bg-white/10 hover:bg-white hover:text-[#171717] px-6 py-3 rounded-full border border-white/40 transition-all duration-200 cursor-pointer shadow-2xs"
                  >
                    <span>{card.ctaText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3 — NEW ARRIVALS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#D8D4CA] pb-4">
          <div>
            <div className="w-10 h-1 bg-[#8A927A] rounded-full mb-3" />
            <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-[#171717]">
              New Arrivals
            </h2>
            <p className="text-xs sm:text-sm text-[#77746D] mt-1 font-normal">
              Discover the latest drops from Eleven Nation.
            </p>
          </div>

          <Link
            to="/new-arrivals"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[#171717] hover:text-[#8A927A] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>View All New</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {newArrivals.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-10 text-center space-y-2 shadow-2xs">
            <p className="text-sm font-bold text-[#171717] font-display uppercase tracking-wider">
              New arrivals dropping soon
            </p>
            <p className="text-xs text-[#77746D] max-w-md mx-auto">
              Our upcoming seasonal drops and authentic match kits are in preparation. Check back shortly.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 4 — FEATURED COLLECTION (CASUAL WEAR) */}
      {casualCampaign && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#171717] text-[#F5F3EE] grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-[#D8D4CA]/25 rounded-2xl shadow-2xs">
            {/* Left Content Column */}
            <div className="lg:col-span-5 p-8 sm:p-12 lg:p-16 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-[0.22em] font-medium text-[#8A927A]">
                  {casualCampaign.subtitle}
                </span>
                <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white uppercase">
                  {casualCampaign.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#B7B2A7] leading-relaxed font-light">
                  {casualCampaign.description}
                </p>

                {/* Bullets */}
                <div className="pt-4 space-y-2.5">
                  {casualCampaign.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-[#D8D4CA]">
                      <span className="w-1.5 h-1.5 bg-[#8A927A] rounded-full shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Link
                  to={casualCampaign.ctaLink}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#171717] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#F5F3EE] transition-all cursor-pointer rounded-full shadow-2xs"
                >
                  <span>{casualCampaign.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right Photography Split */}
            <div className="lg:col-span-7 grid grid-cols-2 min-h-[350px] lg:min-h-full">
              <img
                src={casualCampaign.imageUrl}
                alt="Eleven Nation Heavyweight Casual Drop"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.88]"
              />
              <img
                src={casualCampaign.secondaryImageUrl}
                alt="Eleven Nation Fabric Detail"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.85]"
              />
            </div>
          </div>
        </section>
      )}

      {/* SECTION 5 — FOOTBALL CULTURE */}
      {footballCampaign && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1C1D1A] text-[#F5F3EE] grid grid-cols-1 lg:grid-cols-12 overflow-hidden border border-[#D8D4CA]/25 rounded-2xl shadow-2xs">
            {/* Left Imagery Split */}
            <div className="lg:col-span-7 order-2 lg:order-1 grid grid-cols-2 min-h-[350px] lg:min-h-full">
              <img
                src={footballCampaign.imageUrl}
                alt="Eleven Nation Match Kit Action"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.90]"
              />
              <img
                src={footballCampaign.secondaryImageUrl}
                alt="Football Kit Crest"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover object-center filter brightness-[0.86]"
              />
            </div>

            {/* Right Content Column */}
            <div className="lg:col-span-5 order-1 lg:order-2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between space-y-8">
              <div className="space-y-4">
                <span className="text-xs uppercase tracking-[0.22em] font-medium text-[#8A927A]">
                  {footballCampaign.subtitle}
                </span>
                <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-white uppercase">
                  {footballCampaign.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#B7B2A7] leading-relaxed font-light">
                  {footballCampaign.description}
                </p>

                <div className="pt-4 space-y-2.5">
                  {footballCampaign.features.map((feat: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2.5 text-xs text-[#D8D4CA]">
                      <span className="w-1.5 h-1.5 bg-[#8A927A] rounded-full shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Link
                  to={footballCampaign.ctaLink}
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#8A927A] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#788069] transition-all cursor-pointer rounded-full shadow-2xs"
                >
                  <span>{footballCampaign.ctaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 6 — BEST SELLERS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#D8D4CA] pb-4">
          <div>
            <div className="w-10 h-1 bg-[#8A927A] rounded-full mb-3" />
            <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-tight text-[#171717]">
              Best Sellers
            </h2>
            <p className="text-xs sm:text-sm text-[#77746D] mt-1 font-normal">
              Top trending pieces preferred by our community in Bangladesh.
            </p>
          </div>

          <Link
            to="/featured"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-[#171717] hover:text-[#8A927A] flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <span>View All Bestsellers</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {bestSellers.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-10 text-center space-y-2 shadow-2xs">
            <p className="text-sm font-bold text-[#171717] font-display uppercase tracking-wider">
              Curated collection in progress
            </p>
            <p className="text-xs text-[#77746D] max-w-md mx-auto">
              Featured products and top community favorites will be highlighted here once live orders commence.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 7 — BRAND STORY */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white border border-[#D8D4CA] rounded-3xl p-8 sm:p-14 lg:p-18 text-center max-w-4xl mx-auto space-y-6 shadow-2xs">
          <div className="inline-flex items-center gap-2">
            <span className="w-8 h-[1px] bg-[#8A927A]" />
            <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-[#8A927A]">
              THE MANIFESTO
            </span>
            <span className="w-8 h-[1px] bg-[#8A927A]" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-display font-black uppercase tracking-tight text-[#171717]">
            THIS IS ELEVEN NATION.
          </h2>

          <p className="text-xs sm:text-sm md:text-base text-[#77746D] leading-relaxed max-w-2xl mx-auto font-normal">
            Born from the intersection of stadium energy and metropolitan streetwear, 
            ELEVEN NATION exists to bridge genuine football obsession with immaculate everyday silhouettes. 
            From 260+ GSM compact combed cotton casual essentials to faithful match-issue kits with official font typography, 
            we engineer apparel for those who live with relentless conviction.
          </p>

          <div className="pt-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#171717]">
              WEAR YOUR IDENTITY.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
