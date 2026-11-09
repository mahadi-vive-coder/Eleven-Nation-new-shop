import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, ShoppingBag, User, Menu, X, Heart, ChevronDown } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { useCart } from '../../contexts/CartContext';
import { useWishlist } from '../../contexts/WishlistContext';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onOpenSearch: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSearch }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { totals, toggleCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { customer, isLoggedIn } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (headerSearchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(headerSearchQuery.trim())}`);
      setHeaderSearchQuery('');
    }
  };

  const handleMouseEnter = (name: string) => {
    if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    setActiveDropdown(name);
  };

  const handleMouseLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 150);
  };

  return (
    <>
      <header
        className={`sticky top-0 z-30 transition-all duration-300 font-sans ${
          isScrolled
            ? 'bg-[#F5F3EE]/95 backdrop-blur-md shadow-xs border-b border-[#D8D4CA]'
            : 'bg-[#F5F3EE] border-b border-[#D8D4CA]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20 gap-4">
            {/* Zone 1: Left - Brand Logo (Text-based only) & Mobile Menu Toggle */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 -ml-2 text-[#171717] hover:text-[#8A927A] rounded-full transition-colors"
                aria-label="Open mobile menu"
              >
                <Menu className="w-6 h-6" />
              </button>

              <BrandLogo size="md" />
            </div>

            {/* Zone 2: Center - Desktop Navigation Links with rounded pill active state & dropdowns */}
            <nav className="hidden lg:flex items-center gap-2 xl:gap-3 text-sm">
              {/* 1. Home */}
              <NavLink
                to="/"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? 'bg-[#EAE6DF] text-[#171717]'
                      : 'text-[#171717] hover:bg-[#EAE6DF]/60'
                  }`
                }
              >
                Home
              </NavLink>

              {/* 2. Shop with Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('shop')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/shop"
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    location.pathname === '/shop' && !location.search.includes('category=')
                      ? 'bg-[#EAE6DF] text-[#171717]'
                      : 'text-[#171717] hover:bg-[#EAE6DF]/60'
                  }`}
                >
                  <span>Shop</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#77746D]" />
                </Link>

                {activeDropdown === 'shop' && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-[#D8D4CA] rounded-2xl shadow-lg py-2 z-40 animate-in fade-in-50 duration-150">
                    <Link
                      to="/shop"
                      className="block px-4 py-2 text-xs text-[#171717] hover:bg-[#F5F3EE] font-medium"
                    >
                      All Products
                    </Link>
                    <Link
                      to="/new-arrivals"
                      className="block px-4 py-2 text-xs text-[#171717] hover:bg-[#F5F3EE] font-medium"
                    >
                      New Arrivals
                    </Link>
                    <Link
                      to="/featured"
                      className="block px-4 py-2 text-xs text-[#171717] hover:bg-[#F5F3EE] font-medium"
                    >
                      Best Sellers
                    </Link>
                  </div>
                )}
              </div>

              {/* 3. Casual Wear with Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('casual')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/casual-clothing"
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    location.pathname.includes('casual')
                      ? 'bg-[#EAE6DF] text-[#171717]'
                      : 'text-[#171717] hover:bg-[#EAE6DF]/60'
                  }`}
                >
                  <span>Casual Wear</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#77746D]" />
                </Link>

                {activeDropdown === 'casual' && (
                  <div className="absolute top-full left-0 mt-1 w-52 bg-white border border-[#D8D4CA] rounded-2xl shadow-lg py-2 z-40 animate-in fade-in-50 duration-150">
                    <Link
                      to="/casual-clothing"
                      className="block px-4 py-2 text-xs text-[#171717] hover:bg-[#F5F3EE] font-semibold"
                    >
                      All Casual Wear
                    </Link>
                    <Link
                      to="/shop?category=casual&subcategory=oversized-tees"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Oversized T-Shirts
                    </Link>
                    <Link
                      to="/shop?category=casual&subcategory=polo-shirts"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Polo Shirts
                    </Link>
                    <Link
                      to="/shop?category=casual&subcategory=hoodies"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Heavyweight Hoodies
                    </Link>
                    <Link
                      to="/shop?category=casual&subcategory=sweatshirts"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Sweatshirts
                    </Link>
                  </div>
                )}
              </div>

              {/* 4. Football Jerseys with Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => handleMouseEnter('jerseys')}
                onMouseLeave={handleMouseLeave}
              >
                <Link
                  to="/football-jerseys"
                  className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    location.pathname.includes('football') || location.search.includes('category=jerseys')
                      ? 'bg-[#EAE6DF] text-[#171717]'
                      : 'text-[#171717] hover:bg-[#EAE6DF]/60'
                  }`}
                >
                  <span>Football Jerseys</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#77746D]" />
                </Link>

                {activeDropdown === 'jerseys' && (
                  <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-[#D8D4CA] rounded-2xl shadow-lg py-2 z-40 animate-in fade-in-50 duration-150">
                    <Link
                      to="/football-jerseys"
                      className="block px-4 py-2 text-xs text-[#171717] hover:bg-[#F5F3EE] font-semibold"
                    >
                      All Football Collection
                    </Link>
                    <Link
                      to="/shop?category=jerseys&subcategory=club"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Club Kits (2024/25)
                    </Link>
                    <Link
                      to="/shop?category=jerseys&subcategory=national"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      National Teams
                    </Link>
                    <Link
                      to="/shop?category=jerseys&subcategory=retro"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Retro Legends
                    </Link>
                    <Link
                      to="/shop?category=jerseys&subcategory=training"
                      className="block px-4 py-2 text-xs text-[#77746D] hover:text-[#171717] hover:bg-[#F5F3EE]"
                    >
                      Football Training & Pants
                    </Link>
                  </div>
                )}
              </div>

              {/* 5. About Us */}
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  `px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? 'bg-[#EAE6DF] text-[#171717]'
                      : 'text-[#171717] hover:bg-[#EAE6DF]/60'
                  }`
                }
              >
                About Us
              </NavLink>
            </nav>

            {/* Zone 3: Right - Search Pill Input & Action Icons matching reference screenshot */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Rounded Search Input Bar directly embedded in Header (Screenshot) */}
              <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
                <input
                  type="text"
                  value={headerSearchQuery}
                  onChange={(e) => setHeaderSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-48 xl:w-64 pl-4 pr-9 py-2 text-xs rounded-full bg-[#EFECE6]/80 border border-[#D8D4CA] text-[#171717] placeholder:text-[#77746D] focus:outline-none focus:border-[#171717] transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#77746D] hover:text-[#171717] p-1 cursor-pointer"
                  aria-label="Search"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* Mobile Search Button */}
              <button
                onClick={onOpenSearch}
                type="button"
                className="md:hidden p-2 text-[#171717] hover:text-[#8A927A] rounded-full hover:bg-[#D8D4CA]/30 transition-all cursor-pointer"
                aria-label="Open search"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Customer Account Icon */}
              <Link
                to={isLoggedIn ? '/account' : '/login'}
                className="p-2 text-[#171717] hover:text-[#8A927A] rounded-full hover:bg-[#D8D4CA]/30 transition-all flex items-center justify-center cursor-pointer"
                aria-label="My Account"
                title={isLoggedIn ? `Account: ${customer?.fullName}` : 'Login / Register'}
              >
                <User className="w-5 h-5 stroke-[1.75]" />
              </Link>

              {/* Wishlist Link */}
              <Link
                to="/shop?filter=wishlist"
                className="relative p-2 text-[#171717] hover:text-[#8A927A] rounded-full hover:bg-[#D8D4CA]/30 transition-all flex items-center justify-center cursor-pointer"
                aria-label="Wishlist"
                title="Wishlist"
              >
                <Heart className="w-5 h-5 stroke-[1.75]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 bg-[#171717] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Shopping Bag Icon with Live Counter */}
              <button
                type="button"
                onClick={toggleCart}
                className="relative p-2 text-[#171717] hover:text-[#8A927A] rounded-full hover:bg-[#D8D4CA]/30 transition-all cursor-pointer flex items-center justify-center"
                aria-label="Shopping bag"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.75]" />
                {totals.itemCount > 0 && (
                  <span className="absolute 0 top-0.5 right-0.5 bg-[#171717] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                    {totals.itemCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-[#F5F3EE] shadow-2xl flex flex-col z-50 animate-in slide-in-from-left duration-250">
            {/* Drawer Header */}
            <div className="p-4 border-b border-[#D8D4CA] flex items-center justify-between bg-[#171717]">
              <BrandLogo size="sm" variant="dark" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-[#B7B2A7] hover:text-white rounded-none transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation items */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
              <div className="space-y-1">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-xs font-semibold tracking-[0.14em] uppercase text-[#171717] hover:bg-[#D8D4CA]/30 rounded-lg transition-colors"
                >
                  Home
                </Link>
                <Link
                  to="/shop"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-xs font-semibold tracking-[0.14em] uppercase text-[#171717] hover:bg-[#D8D4CA]/30 rounded-lg transition-colors"
                >
                  Shop All
                </Link>
                <Link
                  to="/casual-clothing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-xs font-semibold tracking-[0.14em] uppercase text-[#171717] hover:bg-[#D8D4CA]/30 rounded-lg transition-colors"
                >
                  Casual Wear
                </Link>
                <Link
                  to="/football-jerseys"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-xs font-semibold tracking-[0.14em] uppercase text-[#171717] hover:bg-[#D8D4CA]/30 rounded-lg transition-colors"
                >
                  Football Jerseys
                </Link>
                <Link
                  to="/about"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2.5 px-3 text-xs font-semibold tracking-[0.14em] uppercase text-[#171717] hover:bg-[#D8D4CA]/30 rounded-lg transition-colors"
                >
                  About Us
                </Link>
              </div>

              <div className="pt-4 border-t border-[#D8D4CA] space-y-1">
                <span className="block px-3 text-[10px] font-bold text-[#77746D] uppercase tracking-[0.2em]">
                  Customer Care
                </span>
                <Link
                  to="/track-order"
                  className="block py-2 px-3 text-xs font-medium text-[#171717] hover:bg-[#D8D4CA]/30 rounded-none"
                >
                  Track Your Order
                </Link>
                <Link
                  to="/shipping-policy"
                  className="block py-2 px-3 text-xs font-medium text-[#171717] hover:bg-[#D8D4CA]/30 rounded-none"
                >
                  Shipping & Delivery
                </Link>
                <Link
                  to="/returns-policy"
                  className="block py-2 px-3 text-xs font-medium text-[#171717] hover:bg-[#D8D4CA]/30 rounded-none"
                >
                  7-Day Return Policy
                </Link>
                <Link
                  to="/faq"
                  className="block py-2 px-3 text-xs font-medium text-[#171717] hover:bg-[#D8D4CA]/30 rounded-none"
                >
                  FAQ & Sizing
                </Link>
                <Link
                  to="/contact"
                  className="block py-2 px-3 text-xs font-medium text-[#171717] hover:bg-[#D8D4CA]/30 rounded-none"
                >
                  Contact Desk
                </Link>
              </div>
            </div>

            {/* Bottom account strip */}
            <div className="p-4 border-t border-[#D8D4CA] bg-white">
              {isLoggedIn ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#171717] truncate">{customer?.fullName}</p>
                    <p className="text-[11px] text-[#77746D]">{customer?.phone}</p>
                  </div>
                  <Link
                    to="/account"
                    className="px-3 py-1.5 text-xs font-medium uppercase tracking-wider bg-[#171717] text-white hover:bg-[#2A2925] transition-colors"
                  >
                    My Account
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    className="py-2.5 text-center text-xs font-medium uppercase tracking-[0.14em] bg-[#171717] text-white hover:bg-[#2A2925] transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="py-2.5 text-center text-xs font-medium uppercase tracking-[0.14em] border border-[#171717] text-[#171717] hover:bg-[#F5F3EE] transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
