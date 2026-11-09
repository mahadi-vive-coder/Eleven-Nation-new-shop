import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, RotateCcw, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductCard } from '../components/common/ProductCard';
import { productService, ProductFilters, extractAvailableColors, productMatchesColor } from '../services/productService';
import { categoryService } from '../services/categoryService';
import { Product, ProductCategory } from '../types';
import { CategoryMetadata } from '../data/demoCategories';
import { useWishlist } from '../contexts/WishlistContext';

interface ShopPageProps {
  presetCategory?: ProductCategory;
  presetFilter?: 'new' | 'bestsellers';
  pageTitle?: string;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  presetCategory,
  presetFilter,
  pageTitle,
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { wishlist } = useWishlist();

  // Filters state from query parameters or props
  const initialCategory = presetCategory || (searchParams.get('category') as ProductCategory) || 'all';
  const initialSubcategory = searchParams.get('subcategory') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialFilter = presetFilter || searchParams.get('filter') || '';
  const initialColor = searchParams.get('color') || '';

  const [category, setCategory] = useState<ProductCategory | 'all'>(initialCategory);
  const [subcategory, setSubcategory] = useState<string>(initialSubcategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>(initialColor);
  const [priceRange, setPriceRange] = useState<[number, number]>([750, 3000]);
  const [sortBy, setSortBy] = useState<ProductFilters['sortBy']>('featured');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Accordion toggle states in sidebar
  const [categoryOpen, setCategoryOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(true);
  const [colorOpen, setColorOpen] = useState(true);

  // Base products in the currently selected category/listing (before size, color, price are applied)
  const [baseProducts, setBaseProducts] = useState<Product[]>([]);
  // Displayed products after all active filters and sorting
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(8);

  // Sync state with URL params when they change
  useEffect(() => {
    if (presetCategory) {
      setCategory(presetCategory);
    } else {
      const cat = searchParams.get('category') as ProductCategory;
      if (cat) setCategory(cat);
    }
    const sub = searchParams.get('subcategory');
    if (sub) setSubcategory(sub);
    const q = searchParams.get('search');
    if (q !== null) setSearchQuery(q);
    const col = searchParams.get('color');
    if (col !== null) setSelectedColor(col);
  }, [searchParams, presetCategory]);

  // Load categories and base product listing for currently selected category/subcategory/search
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allCats, fetchedProducts] = await Promise.all([
          categoryService.getCategories(),
          productService.getProducts({
            category,
            subcategory,
            searchQuery,
          }),
        ]);

        setCategories(allCats);

        // Filter based on filter flags (wishlist, new, bestsellers)
        let listing: Product[];
        if (initialFilter === 'wishlist') {
          listing = fetchedProducts.filter((p) => wishlist.includes(p.id));
        } else if (initialFilter === 'new') {
          listing = fetchedProducts.filter((p) => p.isNewArrival || p.is_new_arrival);
        } else if (initialFilter === 'bestsellers') {
          listing = fetchedProducts.filter((p) => p.isBestSeller);
        } else {
          listing = fetchedProducts;
        }

        setBaseProducts(listing);
      } catch (err) {
        console.error('Error fetching shop products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [category, subcategory, searchQuery, initialFilter, wishlist]);

  // Dynamic available colors derived strictly from product data in the current listing
  const availableColors = useMemo(() => {
    return extractAvailableColors(baseProducts);
  }, [baseProducts]);

  // Automatically clear selectedColor if it's no longer present in availableColors of current listing
  useEffect(() => {
    if (selectedColor && !availableColors.some((c) => c.name.toLowerCase() === selectedColor.toLowerCase())) {
      setSelectedColor('');
    }
  }, [availableColors, selectedColor]);

  // Apply secondary filters (size, dynamic color, price range, and sorting)
  useEffect(() => {
    let filtered = [...baseProducts];

    // Filter by Size
    if (selectedSize) {
      filtered = filtered.filter((p) =>
        p.variants.some((v) => v.size === selectedSize && v.stock > 0)
      );
    }

    // Filter by Dynamic Color
    if (selectedColor) {
      filtered = filtered.filter((p) => productMatchesColor(p, selectedColor));
    }

    // Filter by Price Range
    filtered = filtered.filter(
      (p) => p.basePrice >= priceRange[0] && p.basePrice <= priceRange[1]
    );

    // Sorting
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'price-asc':
        filtered.sort((a, b) => a.basePrice - b.basePrice);
        break;
      case 'price-desc':
        filtered.sort((a, b) => b.basePrice - a.basePrice);
        break;
      case 'best-selling':
        filtered.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
        break;
      case 'featured':
      default:
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    setProducts(filtered);
  }, [baseProducts, selectedSize, selectedColor, priceRange, sortBy]);

  const activeCategoryMeta = useMemo(() => {
    return categories.find((c) => c.slug === category);
  }, [categories, category]);

  const availableSizes = ['S', 'M', 'L', 'XL', 'XXL'];

  const handleResetFilters = () => {
    if (!presetCategory) setCategory('all');
    setSubcategory('all');
    setSearchQuery('');
    setSelectedSize('');
    setSelectedColor('');
    setPriceRange([750, 3000]);
    setSortBy('featured');
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    (!presetCategory && category !== 'all') ||
    subcategory !== 'all' ||
    searchQuery ||
    selectedSize ||
    selectedColor ||
    priceRange[0] !== 750 ||
    priceRange[1] !== 3000
  );

  const displayTitle = pageTitle || (
    initialFilter === 'wishlist'
      ? 'SAVED TO WISHLIST'
      : initialFilter === 'new'
      ? 'NEW ARRIVALS'
      : initialFilter === 'bestsellers'
      ? 'BEST SELLERS'
      : category === 'all'
      ? 'ALL PRODUCTS'
      : activeCategoryMeta?.name || 'COLLECTION'
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Header section matching reference screenshot */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            {/* Small decorative olive bar from reference image */}
            <div className="w-10 h-1 bg-[#8A927A] rounded-full mb-3" />
            
            <h1 className="text-3xl sm:text-4xl font-display font-black uppercase tracking-tight text-[#171717]">
              {displayTitle}
            </h1>

            <p className="text-sm text-[#77746D] mt-1 font-normal">
              Discover the best of Eleven Nation
            </p>
          </div>

          {/* Right Sort By Dropdown (Pill style matching reference screenshot) */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Mobile Filter Button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#171717] px-4 py-2.5 rounded-full border border-[#D8D4CA] bg-white cursor-pointer shadow-2xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#8A927A]" />
              <span>Filters {hasActiveFilters && '•'}</span>
            </button>

            {/* Pill dropdown */}
            <div className="relative inline-flex items-center">
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as ProductFilters['sortBy'])}
                className="appearance-none rounded-full border border-[#D8D4CA] bg-white px-5 py-2.5 pr-10 text-xs font-semibold text-[#171717] focus:outline-none cursor-pointer shadow-2xs hover:border-[#171717] transition-colors"
              >
                <option value="featured">Sort by: Featured</option>
                <option value="newest">Sort by: Newest</option>
                <option value="price-asc">Sort by: Price (Low to High)</option>
                <option value="price-desc">Sort by: Price (High to Low)</option>
                <option value="best-selling">Sort by: Bestselling</option>
              </select>
              <ChevronDown className="w-4 h-4 text-[#77746D] absolute right-3.5 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Subcategories strip if a specific category is selected */}
        {activeCategoryMeta && activeCategoryMeta.subcategories.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#D8D4CA]/50 overflow-x-auto text-xs pb-1">
            <span className="text-[10px] font-bold uppercase text-[#77746D] tracking-[0.2em] shrink-0">
              Subcategory:
            </span>
            {activeCategoryMeta.subcategories.map((sub) => (
              <button
                key={sub.slug}
                onClick={() => {
                  setSubcategory(sub.slug);
                  setSearchParams({ category: category, subcategory: sub.slug });
                }}
                className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors cursor-pointer border ${
                  subcategory === sub.slug
                    ? 'border-[#171717] bg-[#171717] text-white font-semibold'
                    : 'border-[#D8D4CA] bg-white text-[#77746D] hover:border-[#171717] hover:text-[#171717]'
                }`}
              >
                {sub.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Grid & Filters Layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Desktop Filter Sidebar matching reference screenshot */}
        <aside className="hidden lg:block lg:w-60 xl:w-64 shrink-0">
          <div className="bg-white border border-[#D8D4CA] rounded-2xl p-5 space-y-6 shadow-2xs sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8D4CA]/70">
              <span className="text-sm font-display font-bold text-[#171717] tracking-tight">
                Filter Products
              </span>
              <SlidersHorizontal className="w-4 h-4 text-[#77746D]" />
            </div>

            {/* Category Section with Radio buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setCategoryOpen(!categoryOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#171717] tracking-wide cursor-pointer"
              >
                <span>Category</span>
                <ChevronUp className={`w-3.5 h-3.5 text-[#77746D] transition-transform ${categoryOpen ? '' : 'rotate-180'}`} />
              </button>

              {categoryOpen && (
                <div className="space-y-2 pt-1 text-xs text-[#171717]">
                  {[
                    { label: 'All Products', val: 'all' },
                    { label: 'Casual Clothing', val: 'casual' },
                    { label: 'Football Jerseys', val: 'jerseys' },
                  ].map((catOpt) => (
                    <label
                      key={catOpt.val}
                      className="flex items-center gap-2.5 cursor-pointer group py-0.5"
                    >
                      <input
                        type="radio"
                        name="shop-category-desktop"
                        checked={category === catOpt.val}
                        onChange={() => {
                          setCategory(catOpt.val as ProductCategory | 'all');
                          setSubcategory('all');
                          setSearchParams(catOpt.val === 'all' ? {} : { category: catOpt.val });
                        }}
                        className="w-4 h-4 accent-[#171717] cursor-pointer"
                      />
                      <span className={`text-xs ${category === catOpt.val ? 'font-semibold text-[#171717]' : 'text-[#555] group-hover:text-[#171717]'}`}>
                        {catOpt.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Size Section with Radio buttons */}
            <div className="space-y-3 border-t border-[#D8D4CA]/70 pt-4">
              <button
                type="button"
                onClick={() => setSizeOpen(!sizeOpen)}
                className="w-full flex items-center justify-between text-xs font-bold text-[#171717] tracking-wide cursor-pointer"
              >
                <span>Size</span>
                <ChevronUp className={`w-3.5 h-3.5 text-[#77746D] transition-transform ${sizeOpen ? '' : 'rotate-180'}`} />
              </button>

              {sizeOpen && (
                <div className="space-y-2 pt-1 text-xs text-[#171717]">
                  {availableSizes.map((s) => (
                    <label
                      key={s}
                      className="flex items-center gap-2.5 cursor-pointer group py-0.5"
                    >
                      <input
                        type="radio"
                        name="shop-size-desktop"
                        checked={selectedSize === s}
                        onChange={() => setSelectedSize(selectedSize === s ? '' : s)}
                        onClick={() => {
                          if (selectedSize === s) setSelectedSize('');
                        }}
                        className="w-4 h-4 accent-[#171717] cursor-pointer"
                      />
                      <span className={`text-xs ${selectedSize === s ? 'font-semibold text-[#171717]' : 'text-[#555] group-hover:text-[#171717]'}`}>
                        {s}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            

            {/* Price Range Slider */}
            <div className="space-y-3 border-t border-[#D8D4CA]/70 pt-4">
              <div className="flex justify-between text-xs font-bold text-[#171717]">
                <span>Price Range</span>
                <span className="tabular-nums text-[#77746D] font-medium">৳{priceRange[0]} – ৳{priceRange[1]}</span>
              </div>
              <input
                type="range"
                min="750"
                max="3000"
                step="50"
                value={priceRange[1]}
                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                className="w-full accent-[#171717] cursor-pointer"
              />
              <div className="flex justify-between text-[11px] text-[#77746D] tabular-nums">
                <span>৳750</span>
                <span>৳3,000</span>
              </div>
            </div>

            {/* Clear Filters Button (Pill button with refresh icon) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full py-2.5 px-4 rounded-full border border-[#D8D4CA] text-xs font-semibold text-[#171717] hover:bg-[#F5F3EE] transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#77746D]" />
                <span>Clear Filters</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Product Grid Area: 4 columns on desktop matching reference screenshot */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[#77746D] text-[11px] font-medium">Active:</span>
              {!presetCategory && category !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs">
                  Category: {category === 'casual' ? 'Casual' : 'Jerseys'}
                  <X className="w-3 h-3 cursor-pointer text-[#77746D] hover:text-[#171717]" onClick={() => setCategory('all')} />
                </span>
              )}
              {subcategory !== 'all' && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs">
                  Subcategory: {subcategory}
                  <X className="w-3 h-3 cursor-pointer text-[#77746D] hover:text-[#171717]" onClick={() => setSubcategory('all')} />
                </span>
              )}
              {selectedSize && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs">
                  Size: {selectedSize}
                  <X className="w-3 h-3 cursor-pointer text-[#77746D] hover:text-[#171717]" onClick={() => setSelectedSize('')} />
                </span>
              )}
              {selectedColor && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs">
                  Color: {selectedColor}
                  <X className="w-3 h-3 cursor-pointer text-[#77746D] hover:text-[#171717]" onClick={() => setSelectedColor('')} />
                </span>
              )}
              {searchQuery && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#D8D4CA] text-[#171717] text-xs">
                  Search: "{searchQuery}"
                  <X className="w-3 h-3 cursor-pointer text-[#77746D] hover:text-[#171717]" onClick={() => setSearchQuery('')} />
                </span>
              )}
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#8A927A] hover:underline font-semibold ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Product Grid */}
          {loading ? (
            <div className="py-24 text-center">
              <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-semibold uppercase tracking-widest text-[#77746D]">
                Loading collections...
              </p>
            </div>
          ) : products.length === 0 ? (
            /* Friendly Empty State */
            <div className="bg-white border border-[#D8D4CA] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-full bg-[#F5F3EE] mx-auto flex items-center justify-center text-[#77746D]">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#171717] font-display uppercase tracking-wider">
                  No matching products found
                </h3>
                <p className="text-xs text-[#77746D] mt-1 max-w-sm mx-auto leading-relaxed">
                  We couldn't find any products matching your selected filters. Try broadening your price range or selecting another size.
                </p>
              </div>
              <button
                onClick={handleResetFilters}
                className="px-6 py-2.5 rounded-full bg-[#171717] text-white text-xs font-medium uppercase tracking-[0.16em] hover:bg-[#2A2925] transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Responsive 4-Column Product Grid matching reference screenshot */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {products.slice(0, visibleCount).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Load More Button */}
              {visibleCount < products.length && (
                <div className="text-center pt-4">
                  <button
                    onClick={() => setVisibleCount((prev) => prev + 4)}
                    className="px-8 py-3 rounded-full bg-white border border-[#171717] text-[#171717] text-xs font-semibold uppercase tracking-[0.16em] hover:bg-[#171717] hover:text-white transition-all cursor-pointer shadow-2xs"
                  >
                    Load More Products ({products.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Filters Slide-over Sheet */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 lg:hidden overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileFilterOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white shadow-2xl flex flex-col border-l border-[#D8D4CA]">
              <div className="p-4 border-b border-[#D8D4CA] flex items-center justify-between bg-[#171717] text-white">
                <span className="text-xs font-bold uppercase tracking-[0.16em]">Filters & Sorting</span>
                <button onClick={() => setMobileFilterOpen(false)} className="p-1 text-[#B7B2A7] hover:text-white cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#171717]">Category</label>
                  <div className="space-y-2">
                    {[
                      { label: 'All Products', val: 'all' },
                      { label: 'Casual Clothing', val: 'casual' },
                      { label: 'Football Jerseys', val: 'jerseys' },
                    ].map((catOpt) => (
                      <label key={catOpt.val} className="flex items-center gap-2 text-xs">
                        <input
                          type="radio"
                          name="mobile-cat"
                          checked={category === catOpt.val}
                          onChange={() => {
                            setCategory(catOpt.val as ProductCategory | 'all');
                            setSubcategory('all');
                          }}
                          className="accent-[#171717]"
                        />
                        <span>{catOpt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Size */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#171717]">Sizes</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {availableSizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(selectedSize === s ? '' : s)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          selectedSize === s ? 'bg-[#171717] text-white border-[#171717]' : 'border-[#D8D4CA] text-[#171717]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Color - Mobile Drawer (Shown ONLY when relevant products have assigned colors) */}
                {availableColors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#171717]">
                        Color
                      </label>
                      {selectedColor && (
                        <button
                          type="button"
                          onClick={() => setSelectedColor('')}
                          className="text-[10px] font-semibold text-[#8A927A] hover:text-[#171717] underline cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {availableColors.map((col) => (
                        <label
                          key={col.name}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-colors ${
                            selectedColor.toLowerCase() === col.name.toLowerCase()
                              ? 'bg-[#F5F3EE] border-[#171717] font-semibold text-[#171717]'
                              : 'border-[#D8D4CA]/80 hover:bg-[#F5F3EE]/50 text-[#555]'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {col.hex && (
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-[#D8D4CA] shrink-0"
                                style={{ backgroundColor: col.hex }}
                              />
                            )}
                            <span>{col.name}</span>
                          </div>
                          <input
                            type="radio"
                            name="mobile-color"
                            checked={selectedColor.toLowerCase() === col.name.toLowerCase()}
                            onChange={() => {
                              setSelectedColor(selectedColor.toLowerCase() === col.name.toLowerCase() ? '' : col.name);
                            }}
                            onClick={() => {
                              if (selectedColor.toLowerCase() === col.name.toLowerCase()) setSelectedColor('');
                            }}
                            className="w-4 h-4 accent-[#171717]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Max Price</span>
                    <span className="tabular-nums text-[#77746D]">৳{priceRange[1]}</span>
                  </div>
                  <input
                    type="range"
                    min="750"
                    max="3000"
                    step="50"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="w-full accent-[#171717]"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-[#D8D4CA] flex gap-2 bg-[#F5F3EE]">
                <button
                  onClick={handleResetFilters}
                  className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full border border-[#D8D4CA] bg-white text-[#171717] cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-[#171717] text-white hover:bg-[#2A2925] cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
