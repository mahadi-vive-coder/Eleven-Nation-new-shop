import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Heart,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
  Ruler,
  Check,
  Plus,
  Minus,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { productService } from '../services/productService';
import { Product, ProductVariant, JerseyCustomizationSelection } from '../types';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { SizeGuideModal } from '../components/common/SizeGuideModal';
import { ProductCard } from '../components/common/ProductCard';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'shipping' | 'returns'>('details');

  // Jersey customization state
  const [enableCustomization, setEnableCustomization] = useState(
    searchParams.get('customize') === 'true'
  );
  const [customizationMode, setCustomizationMode] = useState<'player' | 'custom'>('player');
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; number: string } | null>(null);
  const [customName, setCustomName] = useState('');
  const [customNumber, setCustomNumber] = useState('');

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      setLoading(true);
      try {
        const item = await productService.getProductBySlug(slug);
        if (item) {
          setProduct(item);
          // Set first in-stock variant by default
          const defaultVar = item.variants.find((v) => v.stock > 0) || item.variants[0];
          setSelectedVariant(defaultVar);
          setSelectedImageIndex(0);
          setQuantity(1);

          // If default players exist for jersey, preselect first
          if (item.jerseyDetails?.defaultPlayers && item.jerseyDetails.defaultPlayers.length > 0) {
            setSelectedPlayer(item.jerseyDetails.defaultPlayers[0]);
          }

          // Fetch related
          const related = await productService.getRelatedProducts(item.id, item.category, 4);
          setRelatedProducts(related);
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F5F3EE]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#77746D]">
            Loading product...
          </span>
        </div>
      </div>
    );
  }

  if (!product || !selectedVariant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-2xl font-display font-bold text-[#111111]">Product Not Found</h2>
        <p className="text-xs text-[#777777]">The requested item could not be found in our catalog.</p>
        <Link
          to="/shop"
          className="inline-block px-8 py-3.5 rounded-full bg-[#171717] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#2A2A2A] transition-colors shadow-2xs"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  const isWishlisted = isInWishlist(product.id);
  const customizationPrice = enableCustomization && product.jerseyDetails?.allowCustomization
    ? product.jerseyDetails.customizationPrice
    : 0;

  const currentUnitPrice = product.basePrice + (selectedVariant.priceModifier || 0) + customizationPrice;

  // Active customization object
  const activeCustomization: JerseyCustomizationSelection | undefined = enableCustomization && product.jerseyDetails?.allowCustomization
    ? {
        name: customizationMode === 'player' ? selectedPlayer?.name || 'NAME' : (customName.toUpperCase().trim() || 'CUSTOM'),
        number: customizationMode === 'player' ? selectedPlayer?.number || '11' : (customNumber.trim() || '11'),
        price: product.jerseyDetails.customizationPrice,
      }
    : undefined;

  const handleAddToCart = () => {
    if (selectedVariant.stock <= 0) return;
    addToCart(product, selectedVariant.id, quantity, activeCustomization);
  };

  const handleBuyNow = () => {
    if (selectedVariant.stock <= 0) return;
    addToCart(product, selectedVariant.id, quantity, activeCustomization);
    navigate('/checkout');
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] font-semibold text-[#77746D]">
        <Link to="/" className="hover:text-[#171717]">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to={`/shop?category=${product.category}`} className="hover:text-[#171717]">
          {product.category === 'casual' ? 'Casual Wear' : 'Football Jerseys'}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-[#171717] truncate font-bold">{product.name}</span>
      </nav>

      {/* Main PDP Grid: Left Gallery + Right Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Column: Image Gallery (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Visual Image Display */}
          <div className="relative w-full aspect-[4/5] bg-[#F5F3EE] border border-[#D8D4CA] rounded-2xl overflow-hidden group shadow-2xs">
            <img
              src={product.images[selectedImageIndex]?.url}
              alt={product.images[selectedImageIndex]?.alt || product.name}
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />

            {/* Badges on main image */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
              {product.isNewArrival && (
                <span className="text-xs font-bold uppercase tracking-[0.16em] bg-[#171717] text-white px-3.5 py-1 rounded-full shadow-2xs">
                  NEW ARRIVAL
                </span>
              )}
              {product.discountPercentage && product.discountPercentage > 0 && (
                <span className="text-xs font-bold uppercase tracking-[0.16em] bg-[#8A927A] text-white px-3.5 py-1 rounded-full shadow-2xs">
                  SAVE {product.discountPercentage}%
                </span>
              )}
            </div>

            {/* If Jersey Customization is Enabled, show floating live back preview */}
            {enableCustomization && activeCustomization && (
              <div className="absolute bottom-4 right-4 bg-[#171717]/95 backdrop-blur-md text-white p-3 border border-white/20 rounded-xl shadow-xl max-w-[200px] text-center">
                <span className="text-[9px] uppercase tracking-widest text-[#8A927A] font-bold block mb-1">
                  Custom Print Preview
                </span>
                <div className="bg-[#242320] p-2 border border-white/10 rounded-lg">
                  <span className="block text-sm font-black tracking-widest font-display text-white">
                    {activeCustomization.name}
                  </span>
                  <span className="block text-2xl font-black font-display text-[#8A927A] leading-none mt-1">
                    {activeCustomization.number}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Thumbnail Strip */}
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-20 h-24 shrink-0 bg-[#F5F3EE] border rounded-xl transition-all cursor-pointer overflow-hidden ${
                    selectedImageIndex === idx
                      ? 'border-[#171717] opacity-100 ring-1 ring-[#171717]'
                      : 'border-[#D8D4CA] opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Contiguous Purchase Module (5 cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-28">
          {/* Header Info */}
          <div className="border-b border-[#D8D4CA] pb-5 space-y-2">
            <div className="flex items-center justify-between text-xs text-[#77746D] font-medium uppercase tracking-[0.16em]">
              <span>{product.category === 'casual' ? 'Casual Collection' : product.jerseyDetails?.league}</span>
              <span className="font-mono text-[11px] text-[#77746D]">SKU: {selectedVariant.sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-display font-black uppercase text-[#171717] tracking-tight">
              {product.name}
            </h1>

            {product.subtitle && (
              <p className="text-sm text-[#77746D] font-normal">
                {product.subtitle}
              </p>
            )}

            {/* Pricing */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-2xl sm:text-3xl font-bold text-[#171717] tabular-nums tracking-tight">
                ৳{currentUnitPrice.toLocaleString()}
              </span>
              {product.originalPrice && product.originalPrice > product.basePrice && (
                <span className="text-base text-[#77746D] line-through tabular-nums">
                  ৳{(product.originalPrice + customizationPrice).toLocaleString()}
                </span>
              )}
              {customizationPrice > 0 && (
                <span className="text-xs text-[#8A927A] font-semibold">
                  (Includes +৳{customizationPrice} printing)
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs sm:text-sm text-[#77746D] leading-relaxed font-normal">
            {product.description}
          </p>

          {/* Color Selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">
              <span>Color: <span className="font-normal text-[#77746D]">{selectedVariant.colorName}</span></span>
            </div>
            <div className="flex items-center gap-2">
              {/* Unique colors in variants */}
              {Array.from(new Set(product.variants.map((v) => v.colorName))).map((colorName) => {
                const variantForColor = product.variants.find((v) => v.colorName === colorName);
                if (!variantForColor) return null;
                const isSelected = selectedVariant.colorName === colorName;
                return (
                  <button
                    key={colorName}
                    onClick={() => {
                      const match = product.variants.find(
                        (v) => v.colorName === colorName && v.size === selectedVariant.size
                      ) || variantForColor;
                      setSelectedVariant(match);
                    }}
                    title={colorName}
                    className={`w-8 h-8 rounded-full border-2 transition-transform cursor-pointer relative flex items-center justify-center ${
                      isSelected ? 'border-[#171717] scale-110 shadow-xs' : 'border-[#D8D4CA]'
                    }`}
                    style={{ backgroundColor: variantForColor.colorHex }}
                  >
                    {isSelected && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          colorName.includes('White') || colorName.includes('Yellow') ? 'bg-black' : 'bg-white'
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size Selector & Size Guide Link */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold uppercase tracking-[0.14em] text-[#171717]">
              <span>Size</span>
              <button
                type="button"
                onClick={() => setSizeGuideOpen(true)}
                className="text-[11px] text-[#8A927A] hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Size Guide</span>
              </button>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {product.variants.map((v) => {
                const isSelected = selectedVariant.id === v.id;
                const isOutOfStock = v.stock <= 0;
                return (
                  <button
                    key={v.id}
                    disabled={isOutOfStock}
                    onClick={() => setSelectedVariant(v)}
                    className={`py-2.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer relative flex flex-col items-center justify-center ${
                      isOutOfStock
                        ? 'border-[#D8D4CA]/50 text-[#B7B2A7] line-through cursor-not-allowed bg-transparent'
                        : isSelected
                        ? 'border-[#171717] bg-[#171717] text-white shadow-2xs'
                        : 'border-[#D8D4CA] bg-white text-[#171717] hover:border-[#171717]'
                    }`}
                  >
                    <span>{v.size}</span>
                    <span className="text-[9px] font-normal opacity-80 mt-0.5 tabular-nums">
                      {isOutOfStock ? 'Sold' : `${v.stock} left`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 8: OPTIONAL JERSEY CUSTOMIZATION MODULE (STRICTLY ONLY FOR FOOTBALL JERSEYS) */}
          {product.category === 'jerseys' && product.jerseyDetails?.allowCustomization && (
            <div className="p-4 bg-[#F5F3EE] border border-[#D8D4CA] rounded-2xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#8A927A]" />
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#171717]">
                    Jersey Custom Printing (+৳{product.jerseyDetails.customizationPrice})
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableCustomization}
                    onChange={(e) => setEnableCustomization(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-[#D8D4CA] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#D8D4CA] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#171717]"></div>
                </label>
              </div>

              {enableCustomization && (
                <div className="space-y-3 pt-2 border-t border-[#D8D4CA] animate-in fade-in duration-200">
                  {/* Selector: Squad Legend vs Custom Name */}
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setCustomizationMode('player')}
                      className={`flex-1 py-2 font-semibold uppercase tracking-[0.14em] rounded-full border cursor-pointer transition-colors ${
                        customizationMode === 'player'
                          ? 'border-[#171717] bg-[#171717] text-white shadow-2xs'
                          : 'border-[#D8D4CA] bg-white text-[#77746D] hover:text-[#171717]'
                      }`}
                    >
                      Squad Player
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomizationMode('custom')}
                      className={`flex-1 py-2 font-semibold uppercase tracking-[0.14em] rounded-full border cursor-pointer transition-colors ${
                        customizationMode === 'custom'
                          ? 'border-[#171717] bg-[#171717] text-white shadow-2xs'
                          : 'border-[#D8D4CA] bg-white text-[#77746D] hover:text-[#171717]'
                      }`}
                    >
                      My Name & Number
                    </button>
                  </div>

                  {customizationMode === 'player' && product.jerseyDetails.defaultPlayers ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-[#77746D] uppercase tracking-wider">
                        Select Player:
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {product.jerseyDetails.defaultPlayers.map((player) => (
                          <button
                            key={player.name}
                            type="button"
                            onClick={() => setSelectedPlayer(player)}
                            className={`p-2.5 rounded-xl text-left text-xs border transition-colors cursor-pointer ${
                              selectedPlayer?.name === player.name
                                ? 'border-[#171717] bg-white font-semibold text-[#171717] shadow-2xs'
                                : 'border-[#D8D4CA] bg-white/70 text-[#77746D] hover:border-[#171717]'
                            }`}
                          >
                            <span className="block truncate font-brand">{player.name}</span>
                            <span className="text-[10px] text-[#8A927A] font-bold">#{player.number}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-semibold text-[#77746D] uppercase tracking-wider">
                          Custom Name (Max 12 letters)
                        </label>
                        <input
                          type="text"
                          maxLength={12}
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value.toUpperCase())}
                          placeholder="NAME"
                          className="w-full px-3 py-2 text-xs font-semibold uppercase tracking-wider rounded-xl border border-[#D8D4CA] bg-white text-[#171717] focus:outline-none focus:border-[#171717]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-[#77746D] uppercase tracking-wider">
                          Number (0-99)
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={customNumber}
                          onChange={(e) => setCustomNumber(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="10"
                          className="w-full px-3 py-2 text-xs font-semibold text-center rounded-xl border border-[#D8D4CA] bg-white text-[#171717] focus:outline-none focus:border-[#171717]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Quantity & CTA Buttons in Rounded Pill Style */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Stepper Pill */}
              <div className="flex items-center border border-[#D8D4CA] bg-white rounded-full px-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-[#171717] hover:text-[#8A927A] cursor-pointer"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="px-3 text-xs font-bold text-[#171717] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(selectedVariant.stock, q + 1))}
                  className="p-2.5 text-[#171717] hover:text-[#8A927A] cursor-pointer"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Add to Cart Pill Button */}
              <button
                type="button"
                disabled={selectedVariant.stock <= 0}
                onClick={handleAddToCart}
                className="flex-1 py-3 px-6 rounded-full bg-[#171717] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#2A2925] disabled:bg-[#D8D4CA] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>{selectedVariant.stock <= 0 ? 'Out of Stock' : 'Add to Shopping Bag'}</span>
              </button>

              {/* Wishlist Button Circular */}
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`w-11 h-11 rounded-full border transition-colors flex items-center justify-center cursor-pointer shrink-0 shadow-2xs ${
                  isWishlisted
                    ? 'border-[#171717] bg-[#171717] text-[#8A927A]'
                    : 'border-[#D8D4CA] bg-white text-[#171717] hover:border-[#171717]'
                }`}
                aria-label="Wishlist"
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Buy Now Pill Button */}
            <button
              type="button"
              disabled={selectedVariant.stock <= 0}
              onClick={handleBuyNow}
              className="w-full py-3.5 px-6 rounded-full bg-[#8A927A] text-white text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#788069] disabled:bg-[#D8D4CA] disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>Instant Buy with Cash on Delivery</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Social Proof & Trust Badges */}
          <div className="pt-4 border-t border-[#D8D4CA] grid grid-cols-2 gap-3 text-xs text-[#77746D]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#8A927A] shrink-0" />
              <span>Cash on Delivery across BD</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#8A927A] shrink-0" />
              <span>Dhaka 24-48h · Outside 2-4 days</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-[#8A927A] shrink-0" />
              <span>7-Day Size Exchange</span>
            </div>
            <button
              onClick={handleShare}
              className="flex items-center gap-2 text-left hover:text-[#171717] cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#8A927A] shrink-0" />
              <span>{copiedLink ? 'Link Copied!' : 'Share Product'}</span>
            </button>
          </div>

          {/* Tabbed Product Accordion */}
          <div className="pt-4 border-t border-[#D8D4CA] space-y-3">
            <div className="flex border-b border-[#D8D4CA] text-xs font-semibold uppercase tracking-[0.14em]">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'details'
                    ? 'border-[#171717] text-[#171717]'
                    : 'border-transparent text-[#77746D] hover:text-[#171717]'
                }`}
              >
                Specifications
              </button>
              <button
                onClick={() => setActiveTab('shipping')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'shipping'
                    ? 'border-[#171717] text-[#171717]'
                    : 'border-transparent text-[#77746D] hover:text-[#171717]'
                }`}
              >
                Delivery Rates
              </button>
              <button
                onClick={() => setActiveTab('returns')}
                className={`py-2 px-3 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'returns'
                    ? 'border-[#171717] text-[#171717]'
                    : 'border-transparent text-[#77746D] hover:text-[#171717]'
                }`}
              >
                Exchange Policy
              </button>
            </div>

            <div className="text-xs text-[#77746D] space-y-2 py-1 leading-relaxed">
              {activeTab === 'details' && (
                <div className="space-y-1.5">
                  {product.casualDetails && (
                    <>
                      <p><strong className="text-[#171717]">Material:</strong> {product.casualDetails.material}</p>
                      <p><strong className="text-[#171717]">Fit:</strong> {product.casualDetails.fit}</p>
                      {product.casualDetails.gsm && <p><strong className="text-[#171717]">Weight:</strong> {product.casualDetails.gsm} GSM Heavyweight</p>}
                      {product.casualDetails.careInstructions && (
                        <div>
                          <strong className="text-[#171717]">Care Instructions:</strong>
                          <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[#77746D]">
                            {product.casualDetails.careInstructions.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                  {product.jerseyDetails && (
                    <>
                      <p><strong className="text-[#171717]">Club/Team:</strong> {product.jerseyDetails.teamName}</p>
                      <p><strong className="text-[#171717]">Season:</strong> {product.jerseyDetails.season}</p>
                      <p><strong className="text-[#171717]">League:</strong> {product.jerseyDetails.league}</p>
                      <p><strong className="text-[#171717]">Edition:</strong> {product.jerseyDetails.edition}</p>
                      <p><strong className="text-[#171717]">Kit Type:</strong> {product.jerseyDetails.jerseyType}</p>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'shipping' && (
                <div className="space-y-1 text-xs">
                  <p>• <strong className="text-[#171717]">Dhaka City Delivery:</strong> ৳70 (Delivered within 24–48 hours)</p>
                  <p>• <strong className="text-[#171717]">Outside Dhaka Nationwide:</strong> ৳130 (Delivered within 2–4 business days via courier)</p>
                  <p>• <strong className="text-[#171717]">FREE Delivery:</strong> Automatically applied on orders ৳2,500 and above.</p>
                  <p>• <strong className="text-[#171717]">Cash on Delivery:</strong> Available everywhere in Bangladesh.</p>
                </div>
              )}

              {activeTab === 'returns' && (
                <div className="space-y-1 text-xs">
                  <p>• We offer a straightforward <strong className="text-[#171717]">7-Day Size Exchange</strong> policy across Bangladesh.</p>
                  <p>• Garment must be unworn, unwashed with original Eleven Nation tags attached.</p>
                  <p>• Customized jerseys with personal names and numbers cannot be returned unless a manufacturing flaw is present.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="pt-12 border-t border-[#D8D4CA] space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-display font-black uppercase tracking-tight text-[#171717]">
              You May Also Like
            </h2>
            <Link
              to={`/shop?category=${product.category}`}
              className="text-xs font-semibold uppercase tracking-[0.16em] text-[#171717] hover:text-[#8A927A]"
            >
              Explore Category →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}

      {/* Sizing Guide Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        defaultCategory={product.category}
      />
    </div>
  );
};
