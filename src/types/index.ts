export type ProductCategory = 'casual' | 'jerseys';

export type CasualSubcategory = 
  | 't-shirts' 
  | 'oversized-tees' 
  | 'polo-shirts' 
  | 'shirts' 
  | 'hoodies' 
  | 'sweatshirts' 
  | 'other';

export type JerseySubcategory = 
  | 'club' 
  | 'national' 
  | 'retro';

export type JerseyEdition = 'Fan Edition' | 'Player Edition';
export type JerseyType = 'Home' | 'Away' | 'Third' | 'Special Edition';

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  isPrimary?: boolean;
  sort_order?: number;
}

export interface ProductVariant {
  id: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL' | string;
  colorName: string;
  colorHex: string;
  stock: number;
  sku: string;
  priceModifier?: number;
}

export interface JerseyDetails {
  teamName: string;
  season: string;
  league: string;
  jerseyType: JerseyType;
  edition: JerseyEdition;
  allowCustomization: boolean;
  customizationPrice: number;
  defaultPlayers?: { name: string; number: string }[];
}

export interface CasualDetails {
  material: string;
  fit: 'Regular Fit' | 'Oversized Boxy Fit' | 'Slim Fit' | 'Relaxed Fit';
  gsm?: number;
  careInstructions?: string[];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle?: string;
  short_description?: string;
  description: string;
  category: ProductCategory;
  subcategory: CasualSubcategory | JerseySubcategory | string;
  product_type?: string;
  basePrice: number;
  price?: number;
  originalPrice?: number;
  compare_at_price?: number;
  discountPercentage?: number;
  isNewArrival?: boolean;
  is_new_arrival?: boolean;
  isBestSeller?: boolean;
  isFeatured?: boolean;
  is_featured?: boolean;
  inStock: boolean;
  is_active?: boolean;
  stock_quantity?: number;
  images: ProductImage[];
  featured_image?: string;
  available_sizes?: string[];
  colors?: string[]; // Optional assigned colors from admin (empty or omitted when no colors assigned)
  available_colors?: string[];
  variants: ProductVariant[];
  jerseyDetails?: JerseyDetails;
  casualDetails?: CasualDetails;
  tags: string[];
  sku: string;
  createdAt: string;
  created_at?: string;
  updated_at?: string;
}

export interface JerseyCustomizationSelection {
  name: string;
  number: string;
  price: number;
}

export interface CartItem {
  id: string; // unique composite key: productId-variantId-[customizationHash]
  productId: string;
  product: Product;
  variantId: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  customization?: JerseyCustomizationSelection;
  totalPrice: number;
}

export interface Address {
  id: string;
  district: string;
  area: string;
  fullAddress: string;
  deliveryInstructions?: string;
  isDefault?: boolean;
}

export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  addresses: Address[];
  created_at?: string;
}

export type OrderStatus = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Processing' 
  | 'Shipped' 
  | 'Delivered' 
  | 'Cancelled' 
  | 'Returned';

export interface OrderItem {
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  variantSku: string;
  customization?: JerseyCustomizationSelection;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface OrderTimelineStep {
  status: OrderStatus;
  label: string;
  timestamp: string;
  description: string;
  completed: boolean;
  current: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: {
    district: string;
    area: string;
    fullAddress: string;
    instructions?: string;
  };
  items: OrderItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: 'Cash on Delivery';
  status: OrderStatus;
  timeline: OrderTimelineStep[];
  createdAt: string;
  notes?: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  desktop_image_url: string;
  mobile_image_url: string;
  button_text: string;
  button_link: string;
  image_alt_text: string;
  text_horizontal_position?: 'left' | 'center' | 'right';
  text_vertical_position?: 'top' | 'center' | 'bottom';
  mobile_text_horizontal_position?: 'left' | 'center' | 'right';
  mobile_text_vertical_position?: 'top' | 'center' | 'bottom';
  heading_color?: string;
  subtitle_color?: string;
  heading_size?: 'default' | 'large' | 'xlarge' | 'compact';
  text_max_width?: string;
  text_shadow?: boolean | string;
  overlay_opacity: number; // 0.0 to 1.0 (default 0.0 to 0.10)
  image_position_desktop?: string;
  image_position_mobile?: string;
  transition_type?: 'fade' | 'slide' | 'zoom-fade';
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
  badge?: string;
  // Legacy compatibility aliases
  text_alignment?: 'left' | 'center' | 'right';
  image_position?: string;
}

export interface CategoryCard {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  tag: string;
}

export interface SiteSettings {
  store_name: string;
  tagline: string;
  official_domain: string;
  support_email: string;
  support_phone: string;
  whatsapp_number: string;
  studio_address: string;
  free_shipping_threshold: number;
  dhaka_delivery_fee: number;
  outside_dhaka_delivery_fee: number;
  currency: string;
  currency_symbol: string;
}
