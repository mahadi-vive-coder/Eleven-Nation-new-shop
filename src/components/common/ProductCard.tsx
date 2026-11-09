import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Check } from 'lucide-react';
import { Product } from '../../types';
import { useWishlist } from '../../contexts/WishlistContext';
import { useCart } from '../../contexts/CartContext';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, className = '' }) => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToCart } = useCart();
  const [selectedVariantId, setSelectedVariantId] = useState<string>(product.variants[0]?.id || '');
  const [showQuickSelect, setShowQuickSelect] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const isWishlisted = isInWishlist(product.id);

  const selectedVariant = product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const primaryImg = product.images[0]?.url || '';
  const secondaryImg = product.images[1]?.url || primaryImg;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If football jersey allows customization, take them to product page for full customization experience
    if (product.jerseyDetails?.allowCustomization) {
      window.location.href = `/product/${product.slug}?customize=true`;
      return;
    }

    if (selectedVariant) {
      addToCart(product, selectedVariant.id, 1);
      setIsAdded(true);
      setTimeout(() => setIsAdded(false), 1800);
    }
  };

  return (
    <div
      className={`group relative flex flex-col bg-white rounded-2xl border border-[#D8D4CA] transition-all duration-300 hover:border-[#171717] hover:shadow-md overflow-hidden ${className}`}
      onMouseLeave={() => setShowQuickSelect(false)}
    >
      {/* Visual Image Container with rounded top and clean photography pedestal */}
      <div className="relative w-full aspect-[4/5] bg-[#EAE7DF] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          <img
            src={primaryImg}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {secondaryImg !== primaryImg && (
            <img
              src={secondaryImg}
              alt={`${product.name} alternate view`}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
            />
          )}
        </Link>

        {/* Top Badges: Rounded Pill Badges matching screenshot */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start z-10 pointer-events-none">
          {product.isNewArrival && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#8A927A] text-white px-3 py-0.5 rounded-full shadow-xs">
              New
            </span>
          )}
          {product.isBestSeller && !product.isNewArrival && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#A16E3B] text-white px-3 py-0.5 rounded-full shadow-xs">
              Bestseller
            </span>
          )}
          {product.isFeatured && !product.isNewArrival && !product.isBestSeller && (
            <span className="text-[11px] font-bold uppercase tracking-wider bg-[#77746D] text-white px-3 py-0.5 rounded-full shadow-xs">
              Trending
            </span>
          )}
        </div>

        {/* Wishlist Button: Circular Pill Icon matching screenshot */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product.id);
          }}
          className={`absolute top-3 right-3 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all duration-200 z-10 cursor-pointer border ${
            isWishlisted
              ? 'bg-[#171717] border-[#171717] text-[#8A927A]'
              : 'bg-white/95 border-[#D8D4CA] text-[#171717] hover:scale-110 shadow-xs'
          }`}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : 'stroke-[1.75]'}`} />
        </button>

        {/* Quick Add Overlay on Hover with Pill-shaped Buttons */}
        <div className="absolute inset-x-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {showQuickSelect ? (
            <div className="bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-[#D8D4CA] flex flex-col gap-1.5 shadow-md">
              <span className="text-[10px] font-semibold uppercase text-[#77746D] tracking-wider text-center">
                Select Size
              </span>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    disabled={v.stock <= 0}
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      addToCart(product, v.id, 1);
                      setShowQuickSelect(false);
                      setIsAdded(true);
                      setTimeout(() => setIsAdded(false), 1800);
                    }}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-colors cursor-pointer ${
                      v.stock <= 0
                        ? 'border-[#D8D4CA]/50 text-[#B7B2A7] line-through cursor-not-allowed'
                        : selectedVariantId === v.id
                        ? 'border-[#171717] bg-[#171717] text-white'
                        : 'border-[#D8D4CA] bg-white text-[#171717] hover:border-[#171717]'
                    }`}
                  >
                    {v.size}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowQuickSelect(true);
                }}
                className="flex-1 py-2.5 bg-[#171717] text-white text-xs font-semibold uppercase tracking-wider rounded-full hover:bg-[#2A2925] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isAdded ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#8A927A]" />
                    <span>Added</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Quick Add</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Product Content Details matching screenshot */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-1.5 bg-white">
        <div>
          {/* Product Name */}
          <Link
            to={`/product/${product.slug}`}
            className="block text-sm sm:text-base font-semibold text-[#171717] hover:text-[#8A927A] transition-colors line-clamp-1 font-display"
          >
            {product.name}
          </Link>
        </div>

        {/* Price & Discount Pill matching screenshot: ৳850 ৳1,100 -23% */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-base sm:text-lg font-bold text-[#171717] tabular-nums tracking-tight font-display">
            ৳{product.basePrice.toLocaleString()}
          </span>
          {product.originalPrice && product.originalPrice > product.basePrice && (
            <span className="text-xs text-[#77746D] line-through tabular-nums">
              ৳{product.originalPrice.toLocaleString()}
            </span>
          )}
          {product.discountPercentage && product.discountPercentage > 0 && (
            <span className="text-[10px] font-bold text-[#42634B] bg-[#42634B]/10 px-1.5 py-0.5 rounded-full tabular-nums">
              -{product.discountPercentage}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
