import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Banner } from '../../types';

interface HeroBannerSliderProps {
  banners: Banner[];
  autoSlideInterval?: number; // ms, default 4500 (4.5s)
}

export const HeroBannerSlider: React.FC<HeroBannerSliderProps> = ({
  banners,
  autoSlideInterval = 4500,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const totalBanners = banners.length;
  const hasMultiple = totalBanners > 1;

  // Check reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalBanners);
  }, [totalBanners]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalBanners) % totalBanners);
  }, [totalBanners]);

  // Robust auto-slider: changes slides every 4.5 seconds without requiring click
  useEffect(() => {
    if (!hasMultiple || isHovered || prefersReducedMotion) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      nextSlide();
    }, autoSlideInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hasMultiple, isHovered, prefersReducedMotion, nextSlide, autoSlideInterval, currentIndex]);

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!banners || banners.length === 0) return null;

  const currentBanner = banners[currentIndex] || banners[0];

  // Desktop & Mobile alignment resolver
  const getHorizontalClasses = (align?: 'left' | 'center' | 'right') => {
    switch (align) {
      case 'center':
        return 'items-center text-center mx-auto';
      case 'right':
        return 'items-end text-right ml-auto';
      case 'left':
      default:
        return 'items-start text-left';
    }
  };

  const getVerticalClasses = (valign?: 'top' | 'center' | 'bottom') => {
    switch (valign) {
      case 'top':
        return 'justify-start pt-16 sm:pt-20 lg:pt-24';
      case 'bottom':
        return 'justify-end pb-16 sm:pb-20 lg:pb-24';
      case 'center':
      default:
        return 'justify-center';
    }
  };

  const desktopHoriz = getHorizontalClasses(currentBanner.text_horizontal_position || currentBanner.text_alignment);
  const desktopVert = getVerticalClasses(currentBanner.text_vertical_position);
  const mobileHoriz = getHorizontalClasses(currentBanner.mobile_text_horizontal_position || currentBanner.text_horizontal_position || 'left');
  const mobileVert = getVerticalClasses(currentBanner.mobile_text_vertical_position || 'bottom');

  const headingSizeClass = {
    compact: 'text-3xl sm:text-4xl lg:text-5xl',
    default: 'text-4xl sm:text-5xl lg:text-6xl',
    large: 'text-4xl sm:text-6xl lg:text-7xl',
    xlarge: 'text-4xl sm:text-6xl lg:text-7xl xl:text-[5rem]',
  }[currentBanner.heading_size || 'xlarge'];

  const customTextShadow = typeof currentBanner.text_shadow === 'string'
    ? currentBanner.text_shadow
    : currentBanner.text_shadow
    ? '0 2px 14px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.85)'
    : '0 2px 12px rgba(0,0,0,0.6)';

  return (
    <div
      className="relative w-full h-[400px] sm:h-[460px] lg:h-[500px] rounded-[24px] sm:rounded-[32px] overflow-hidden bg-[#171717] select-none shadow-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Homepage Editorial Hero Banners"
    >
      {/* Visual Image Slides */}
      {banners.map((banner, index) => {
        const isActive = index === currentIndex;
        const opacityVal = banner.overlay_opacity ?? 0.08;

        return (
          <div
            key={banner.id}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Full-width Responsive Picture with proper cropping */}
            <picture className="w-full h-full block">
              <source media="(max-width: 640px)" srcSet={banner.mobile_image_url} />
              <img
                src={banner.desktop_image_url}
                alt={banner.image_alt_text || banner.title}
                className="w-full h-full object-cover"
                style={{
                  objectPosition: banner.image_position_desktop || banner.image_position || 'center 35%',
                }}
                loading={index === 0 ? 'eager' : 'lazy'}
                referrerPolicy="no-referrer"
              />
            </picture>

            {/* Light ambient scrim so text pops cleanly without hiding the image */}
            <div
              className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent pointer-events-none"
            />
          </div>
        );
      })}

      {/* Text Layer directly integrated onto the image */}
      <div className="relative z-20 w-full h-full flex flex-col justify-center px-6 sm:px-12 lg:px-16 max-w-2xl">
        <div className="space-y-3 sm:space-y-4 text-left">
          {/* Kicker tag */}
          <span className="text-[11px] sm:text-xs uppercase tracking-[0.22em] font-bold text-white/90 block">
            {currentBanner.badge || 'SHOP OUR COLLECTION'}
          </span>

          {/* Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black uppercase tracking-tight leading-[0.92] text-white">
            WEAR YOUR{' '}
            <span className="text-[#8A927A] block sm:inline">IDENTITY.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm lg:text-base text-white/90 font-normal leading-relaxed max-w-md font-sans">
            {currentBanner.subtitle || 'Style that speaks. Culture that connects.'}
          </p>

          {/* ONLY ONE CTA BUTTON — Rounded Pill Button in Muted Olive */}
          <div className="pt-2 sm:pt-4">
            <Link
              to={currentBanner.button_link || '/shop'}
              className="inline-flex items-center justify-center gap-2 px-7 py-3 sm:py-3.5 bg-[#8A927A] text-white text-xs font-bold uppercase tracking-wider rounded-full hover:bg-[#788069] transition-all duration-200 shadow-md cursor-pointer group"
            >
              <span>{currentBanner.button_text || 'EXPLORE COLLECTION'}</span>
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Previous & Next Navigation Controls (Desktop hover or touch) */}
      {hasMultiple && (
        <>
          {/* Subtle previous & next chevrons on edges */}
          <button
            type="button"
            onClick={prevSlide}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all border border-white/20 cursor-pointer hidden sm:flex items-center justify-center"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={nextSlide}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-xs transition-all border border-white/20 cursor-pointer hidden sm:flex items-center justify-center"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Bottom-right slide indicators: Pill and Dots matching screenshot */}
          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-10 z-30 flex items-center gap-2">
            {banners.map((_, idx) => {
              const isSelected = currentIndex === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  aria-label={`Jump to slide ${idx + 1}`}
                  className={`transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'w-6 h-2 rounded-full bg-white shadow-xs'
                      : 'w-2 h-2 rounded-full bg-white/40 hover:bg-white/70'
                  }`}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
