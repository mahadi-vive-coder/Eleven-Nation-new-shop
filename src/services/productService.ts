import { DEMO_PRODUCTS } from '../data/demoProducts';
import { Product, ProductCategory, ProductImage, ProductVariant } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ProductFilters {
  category?: ProductCategory | 'all';
  subcategory?: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  color?: string;
  searchQuery?: string;
  sortBy?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'best-selling';
  onlyInStock?: boolean;
}

interface DbProduct {
  id: string;
  name: string;
  slug: string;
  subtitle?: string;
  description?: string;
  product_type?: 'casual' | 'jersey' | 'accessory' | string;
  category_id?: string;
  category?: { id: string; name: string; slug: string } | null;
  base_price: number | string;
  compare_at_price?: number | string | null;
  is_customizable?: boolean;
  customization_charge?: number | string;
  is_active?: boolean;
  is_featured?: boolean;
  is_new_arrival?: boolean;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  images?: Array<{ id: string; url: string; alt_text?: string; is_primary?: boolean; sort_order?: number }>;
}

interface DbVariant {
  id: string;
  product_id: string;
  size: string;
  color: string;
  sku: string;
  price_modifier: number | string;
  is_active: boolean;
  in_stock: boolean;
}

function mapDbProductToProduct(dbProduct: DbProduct, variants: DbVariant[]): Product {
  const mappedVariants: ProductVariant[] = variants.map((v) => ({
    id: v.id,
    size: v.size,
    colorName: v.color,
    colorHex: getColorHex(v.color),
    stock: v.in_stock ? 10 : 0,
    sku: v.sku,
    priceModifier: Number(v.price_modifier) || 0,
  }));

  const categorySlug = dbProduct.category?.slug?.toLowerCase() || '';
  const isJersey = dbProduct.product_type === 'jersey' || categorySlug.includes('jersey');
  const categoryType: ProductCategory = isJersey ? 'jerseys' : 'casual';

  const basePriceNum = Number(dbProduct.base_price) || 0;
  const compareAtPriceNum = dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined;
  const discountPct = (compareAtPriceNum && compareAtPriceNum > basePriceNum)
    ? Math.round(((compareAtPriceNum - basePriceNum) / compareAtPriceNum) * 100)
    : undefined;

  const images: ProductImage[] = (dbProduct.images || [])
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((img) => ({
      id: img.id,
      url: img.url,
      alt: img.alt_text || dbProduct.name,
      isPrimary: img.is_primary,
      sort_order: img.sort_order,
    }));

  return {
    id: dbProduct.id,
    slug: dbProduct.slug,
    name: dbProduct.name,
    subtitle: dbProduct.subtitle,
    description: dbProduct.description || '',
    category: categoryType,
    subcategory: dbProduct.category?.name?.toLowerCase().replace(/\s+/g, '-') || (isJersey ? 'club' : 't-shirts'),
    product_type: dbProduct.product_type,
    basePrice: basePriceNum,
    price: basePriceNum,
    originalPrice: compareAtPriceNum,
    compare_at_price: compareAtPriceNum,
    discountPercentage: discountPct,
    isNewArrival: Boolean(dbProduct.is_new_arrival),
    is_new_arrival: Boolean(dbProduct.is_new_arrival),
    isBestSeller: Boolean(dbProduct.is_featured),
    isFeatured: Boolean(dbProduct.is_featured),
    is_featured: Boolean(dbProduct.is_featured),
    inStock: mappedVariants.length > 0 ? mappedVariants.some((v) => v.stock > 0) : true,
    is_active: dbProduct.is_active !== false,
    images: images.length > 0 ? images : [{ id: 'placeholder', url: '/assets/aistudio/703954576_1490319772772161_8218195484706242937_n_1e76a0a0.jpg', alt: dbProduct.name }],
    variants: mappedVariants,
    tags: Array.isArray(dbProduct.tags) ? dbProduct.tags : [],
    sku: mappedVariants[0]?.sku || `EN-${dbProduct.slug.toUpperCase()}`,
    createdAt: dbProduct.created_at || new Date().toISOString(),
    jerseyDetails: isJersey ? {
      teamName: dbProduct.name,
      season: '2024/25',
      league: 'Matchday Edition',
      jerseyType: 'Home',
      edition: 'Fan Edition',
      allowCustomization: Boolean(dbProduct.is_customizable),
      customizationPrice: Number(dbProduct.customization_charge) || 0,
    } : undefined,
  };
}

function applyFiltersAndSort(items: Product[], filters?: ProductFilters): Product[] {
  let results = [...items];

  if (!filters) return results;

  if (filters.category && filters.category !== 'all') {
    results = results.filter((p) => p.category === filters.category);
  }

  if (filters.subcategory && filters.subcategory !== 'all') {
    results = results.filter((p) => p.subcategory === filters.subcategory);
  }

  if (filters.minPrice !== undefined) {
    results = results.filter((p) => p.basePrice >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    results = results.filter((p) => p.basePrice <= filters.maxPrice!);
  }

  if (filters.size) {
    results = results.filter((p) => p.variants.some((v) => v.size === filters.size && v.stock > 0));
  }

  if (filters.color) {
    results = results.filter((p) => productMatchesColor(p, filters.color!));
  }

  if (filters.onlyInStock) {
    results = results.filter((p) => p.inStock);
  }

  if (filters.searchQuery && filters.searchQuery.trim().length > 0) {
    const q = filters.searchQuery.toLowerCase().trim();
    results = results.filter((p) => {
      const inName = p.name.toLowerCase().includes(q);
      const inSubtitle = p.subtitle?.toLowerCase().includes(q) ?? false;
      const inDesc = p.description.toLowerCase().includes(q);
      const inSku = p.sku.toLowerCase().includes(q);
      const inTags = p.tags.some((t) => t.toLowerCase().includes(q));
      const inTeam = p.jerseyDetails?.teamName.toLowerCase().includes(q) ?? false;
      const inSeason = p.jerseyDetails?.season.toLowerCase().includes(q) ?? false;
      const inLeague = p.jerseyDetails?.league.toLowerCase().includes(q) ?? false;
      return inName || inSubtitle || inDesc || inSku || inTags || inTeam || inSeason || inLeague;
    });
  }

  // Sorting
  switch (filters.sortBy) {
    case 'newest':
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
    case 'price-asc':
      results.sort((a, b) => a.basePrice - b.basePrice);
      break;
    case 'price-desc':
      results.sort((a, b) => b.basePrice - a.basePrice);
      break;
    case 'best-selling':
      results.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
      break;
    case 'featured':
    default:
      results.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
      break;
  }

  return results;
}

export const productService = {
  /**
   * Fetch all products or filter according to criteria.
   * When Supabase is configured, fetches live database records using public_product_variants.
   * Never falls back to demo products when live database is configured.
   */
  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('products')
          .select('*, category:categories(id, name, slug), images:product_images(*)')
          .eq('is_active', true);

        if (filters?.category && filters.category !== 'all') {
          if (filters.category === 'jerseys') {
            query = query.eq('product_type', 'jersey');
          } else if (filters.category === 'casual') {
            query = query.eq('product_type', 'casual');
          }
        }

        const { data: dbProducts, error: prodErr } = await query;
        if (prodErr) {
          console.error('Supabase product query error:', prodErr);
          return [];
        }

        if (!dbProducts || dbProducts.length === 0) {
          return [];
        }

        const productIds = dbProducts.map((p) => p.id);
        const { data: dbVariants, error: varErr } = await supabase
          .from('public_product_variants')
          .select('*')
          .in('product_id', productIds);

        const variantsByProduct = new Map<string, DbVariant[]>();
        if (dbVariants && !varErr) {
          for (const v of dbVariants as DbVariant[]) {
            const list = variantsByProduct.get(v.product_id) || [];
            list.push(v);
            variantsByProduct.set(v.product_id, list);
          }
        }

        const mapped = dbProducts.map((p) =>
          mapDbProductToProduct(p as DbProduct, variantsByProduct.get(p.id) || [])
        );

        return applyFiltersAndSort(mapped, filters);
      } catch (err) {
        console.error('Supabase product query error:', err);
        return [];
      }
    }

    // Unconfigured fallback: development demo dataset
    return applyFiltersAndSort([...DEMO_PRODUCTS], filters);
  },

  /**
   * Get single product by slug or id
   */
  async getProductBySlug(slug: string): Promise<Product | null> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbProduct, error: prodErr } = await supabase
          .from('products')
          .select('*, category:categories(id, name, slug), images:product_images(*)')
          .eq('slug', slug)
          .single();

        if (prodErr || !dbProduct) {
          return null;
        }

        const { data: dbVariants } = await supabase
          .from('public_product_variants')
          .select('*')
          .eq('product_id', dbProduct.id);

        return mapDbProductToProduct(dbProduct as DbProduct, (dbVariants || []) as DbVariant[]);
      } catch (err) {
        console.error('Supabase getProductBySlug error:', err);
        return null;
      }
    }

    const found = DEMO_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
    return found || null;
  },

  /**
   * Get new arrivals
   */
  async getNewArrivals(limit = 4): Promise<Product[]> {
    const all = await this.getProducts({ sortBy: 'newest' });
    return all.filter((p) => p.isNewArrival).slice(0, limit);
  },

  /**
   * Get best sellers
   */
  async getBestSellers(limit = 4): Promise<Product[]> {
    const all = await this.getProducts({ sortBy: 'best-selling' });
    return all.filter((p) => p.isBestSeller).slice(0, limit);
  },

  /**
   * Get related products by category or tags
   */
  async getRelatedProducts(currentProductId: string, category: ProductCategory, limit = 4): Promise<Product[]> {
    const all = await this.getProducts({ category });
    return all.filter((p) => p.id !== currentProductId).slice(0, limit);
  },

  /**
   * Helper to get assigned colors of a product
   */
  getProductColors(product: Product): string[] {
    return getProductColors(product);
  },

  /**
   * Helper to extract unique available colors with swatch hexes
   */
  getAvailableColors(products: Product[]): { name: string; hex?: string; count: number }[] {
    return extractAvailableColors(products);
  }
};

/**
 * Dynamically extract all assigned colors for a product.
 * Returns empty array if no colors were assigned (e.g. admin left color empty).
 */
export function getProductColors(product: Product): string[] {
  // 1. If product has explicit colors array set by admin
  if (Array.isArray(product.colors)) {
    return product.colors
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim());
  }

  // 2. If product has available_colors array
  if (Array.isArray(product.available_colors)) {
    return product.available_colors
      .filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
      .map((c) => c.trim());
  }

  // 3. Fallback: if variants have explicit distinct colors (ignoring empty or 'Default')
  if (product.variants && Array.isArray(product.variants)) {
    const variantColors = product.variants
      .map((v) => v.colorName)
      .filter((c): c is string => Boolean(c && typeof c === 'string' && c.trim().length > 0 && c.toLowerCase() !== 'default' && c.toLowerCase() !== 'none'));
    if (variantColors.length > 0) {
      return Array.from(new Set(variantColors.map((c) => c.trim())));
    }
  }

  return [];
}

/**
 * Check if a product matches a target color name (case-insensitive substring/equality)
 */
export function productMatchesColor(product: Product, targetColor: string): boolean {
  if (!targetColor || targetColor.trim() === '') return true;
  const target = targetColor.trim().toLowerCase();
  const colors = getProductColors(product);
  return colors.some((c) => c.toLowerCase() === target || c.toLowerCase().includes(target));
}

const COLOR_HEX_MAP: Record<string, string> = {
  'pitch black': '#111111',
  'black': '#111111',
  'midnight black': '#111111',
  'chalk off-white': '#F2EFEB',
  'white': '#FFFFFF',
  'crisp white': '#FFFFFF',
  'sky blue & white': '#75AADB',
  'sky blue': '#75AADB',
  'blaugrana': '#A50044',
  'obsidian & gold': '#18181B',
  'washed ash grey': '#7C7F84',
  'ash grey': '#7C7F84',
  'grey': '#7C7F84',
  'slate charcoal': '#303030',
  'charcoal': '#303030',
  'canarinho yellow': '#FEDD00',
  'yellow': '#FEDD00',
  'burgundy & gold': '#4A1525',
  'burgundy': '#4A1525',
  'black / green / red': '#111111',
};

export function getColorHex(colorName: string, product?: Product): string {
  if (product && product.variants) {
    const v = product.variants.find(
      (v) => v.colorName && v.colorName.toLowerCase().trim() === colorName.toLowerCase().trim() && v.colorHex
    );
    if (v?.colorHex) return v.colorHex;
  }
  return COLOR_HEX_MAP[colorName.toLowerCase().trim()] || '#8A927A';
}

/**
 * Extract unique available colors from a list of products
 */
export function extractAvailableColors(products: Product[]): { name: string; hex?: string; count: number }[] {
  const map = new Map<string, { name: string; hex?: string; count: number }>();
  for (const product of products) {
    const pColors = getProductColors(product);
    for (const c of pColors) {
      const trimmed = c.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(key, {
          name: trimmed,
          hex: getColorHex(trimmed, product),
          count: 1,
        });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}
