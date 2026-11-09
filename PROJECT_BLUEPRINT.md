# ELEVEN NATION — PROJECT BLUEPRINT & MASTER KNOWLEDGE BASE

**Official Domain**: `elevennation.shop`  
**Brand**: ELEVEN NATION  
**Tagline**: WEAR YOUR IDENTITY.  
**Currency**: Bangladeshi Taka (BDT ৳)  
**Primary Market**: Bangladesh  
**Architecture Model**: Two Autonomous Applications (Customer Web + Admin Web) sharing one Supabase backend.

---

## 1. Project Overview

ELEVEN NATION is a premium fashion and football culture e-commerce brand operating in Bangladesh. The brand fuses heavyweight metropolitan casual streetwear (260–400 GSM combed compact cotton, boxy drop-shoulder fits) with authentic club, national, and retro football jerseys featuring custom player and fan name & number printing.

The project is architected as a high-performance, mobile-first customer storefront designed to connect to Supabase in a subsequent phase, while a completely separate administrative application will manage inventory, banners, and orders.

---

## 2. Brand Information

- **Brand Name**: ELEVEN NATION
- **Brand Personality**: Premium, Modern, Minimal, Confident, Sport-inspired, Youth-focused.
- **Brand Manifesto**: *"Born from the intersection of stadium energy and metropolitan streetwear, ELEVEN NATION exists to bridge genuine football obsession with immaculate everyday silhouettes."*
- **Official Domain**: `elevennation.shop`
- **Customer Desk**: Dhaka, Bangladesh (`support@elevennation.shop`, `+880 1712-345678`)

---

## 3. Design System & Visual Benchmark

- **Visual Direction**: `PREMIUM EDITORIAL STREETWEAR` with soft rounded modern UI benchmark (aligned with official reference layout).
- **Brand Logo**: Pure HTML text-only stacked typography (`ELEVEN` over `NATION`) in Manrope bold, deep black (`#171717`). Strictly zero image or SVG logo files.
- **Header & Navigation**: Neutral `#F5F3EE` announcement bar, embedded rounded search pill input, 5 canonical nav links (`Home`, `Shop ▾`, `Casual Wear ▾`, `Football Jerseys ▾`, `About Us`) with active pill background (`bg-[#EAE6DF] rounded-full`).
- **Button Standard**: Consistent rounded pill style (`rounded-full`) across all CTAs, navigation, forms, filters, and cards.
- **Catalog Layout**: Decorative olive bar (`w-10 h-1 bg-[#8A927A] rounded-full`) above `ALL PRODUCTS` title, rounded pill sort dropdown on right, left sidebar with radio Category/Size filters, completely data-driven dynamic Color filter (visible only when relevant products in current listing have assigned colors), and responsive 4-column product grid with soft rounded cards (`rounded-2xl`).
- **Jersey Customization Scope**: Live player and custom name & number printing is strictly restricted to actual football jerseys; non-jersey football gear and casual apparel strictly omit customization options.

---

## 4. Color Palette

| Token | Hex | Role | Usage |
| :--- | :--- | :--- | :--- |
| **Primary Background** | `#F5F3EE` | Warm Off-white | Global body canvas, input field surfaces, image pedestals |
| **Primary Text** | `#171717` | Deep Black | High-contrast editorial headlines, primary CTA buttons, active states |
| **Card Background** | `#FFFFFF` | Pure White | Elevated card containers, modals, cart drawer surfaces |
| **Secondary Text** | `#77746D` | Muted Stone | Subtitles, meta captions, breadcrumbs, placeholder text |
| **Borders & Dividers** | `#D8D4CA` | Soft Border | Subtle hairline dividers, product card outlines, input strokes |
| **Secondary Neutral** | `#B7B2A7` | Muted Beige | Secondary badges, placeholder icons, inactive navigation elements |
| **Subtle Accent** | `#8A927A` | Muted Olive | Subtle accent highlights, sale kickers, active category indicators (hover `#788069`) |
| **Success** | `#42634B` | Muted Forest Green | In-stock verification, order confirmation indicators, free shipping progress |
| **Error** | `#8B2E2E` | Restrained Dark Red | Validation error banners, removal actions, critical alerts |
| **Warning** | `#A16E3B` | Muted Amber | Low-stock urgency notices, order processing badges |

---

## 5. Typography

- **Display & Headings**: `Manrope` (`font-display`), geometric modern grotesque sans-serif with confident letterforms, tracking tight for headlines, wide uppercase for tags.
- **Body & Prose**: `DM Sans` (`font-sans`), geometric and humanistic sans-serif engineered for clean legibility on high-DPI displays.
- **Tabular Figures**: Standardized `tabular-nums` on all BDT prices, dimensions, quantities, and order reference numbers.

---

## 6. Website Architecture

```text
eleven-nation/
├── database/                   # Supabase schema, seeds, migrations & ERD
│   ├── sql/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_seed_demo_data.sql
│   │   └── 003_storage_setup.sql
│   ├── migrations/
│   └── ER_DIAGRAM.md
├── public/
│   └── assets/aistudio/        # Uploaded brand assets & logos
├── src/
│   ├── components/
│   │   ├── banner/             # Reusable HeroBannerSlider
│   │   ├── common/             # BrandLogo, ProductCard, SizeGuide, SearchModal, CartDrawer
│   │   └── layout/             # Header, Footer, TopAnnouncementBar
│   ├── contexts/               # AuthContext, CartContext, WishlistContext
│   ├── data/                   # Realistic demo products, categories, banners
│   ├── lib/                    # Supabase client initializer & config guards
│   ├── pages/                  # All 23 customer pages
│   ├── services/               # Repository layer (product, banner, cart, order, auth, settings)
│   └── types/                  # Domain TypeScript interfaces
├── PROJECT_BLUEPRINT.md        # Master specification
├── CHANGELOG.md                # Phase release history
├── README.md                   # Installation & setup guide
└── SECURITY.md                 # Security architecture & RLS specification
```

---

## 7. Complete Page List (23 Canonical Customer Views)

1. **Homepage** (`/`): Dynamic hero banner slider, category showcases, new arrivals, featured campaigns, best sellers, manifesto (strictly zero newsletter/subscription block).
2. **Shop / Catalog** (`/shop`): Full product listing with category, price, size, and keyword filtering with 5-mode sorting (radio sidebar, 4-col grid).
3. **Product Details** (`/product/:slug`): Multi-image zoom gallery, variant selector, jersey custom print configurator, size guide modal, accordion specs.
4. **Casual Clothing** (`/casual-clothing`, `/shop/casual-clothing`): Dedicated streetwear and everyday apparel collection.
5. **Football Jerseys** (`/football-jerseys`, `/shop/football-jerseys`): Club kits, national team editions, and retro legends.
6. **New Arrivals** (`/new-arrivals`): Latest seasonal releases and limited drops.
7. **Featured Collections** (`/featured`): Top-trending community favorites and best sellers.
8. **Shopping Cart** (`/cart`): Full shopping bag management, line item stepper, custom print callouts, and Bangladesh delivery estimate.
9. **Checkout** (`/checkout`): Cash on Delivery order placement form with automatic Dhaka / Outside Dhaka rate calculation.
10. **Order Confirmation** (`/order-confirmation/:orderNumber`): Receipt view, order breakdown, `VIEW INVOICE` modal, `PRINT INVOICE` direct trigger, and celebratory status banner.
11. **Official Invoice** (`/invoice/:orderNumber`): Standalone full-page branded invoice matching the approved editorial template design, supporting direct printing with `?print=true` and PDF export via native browser print dialog (A4 portrait, zero UI chrome).
12. **Customer Login** (`/login`): Authentication interface with demo account credentials and Supabase Auth readiness.
13. **Customer Registration** (`/register`): Account signup capturing name, 11-digit phone number, and password.
14. **Customer Profile** (`/profile`, `/account`): Profile viewing, editing, and contact info update.
15. **Customer Order History** (`/orders`, `/account`): Track past orders, view items, review statuses, with instant `VIEW INVOICE` action on every order.
16. **Track Order** (`/track-order`): Public order tracking portal with real-time consignment milestone stepper and `VIEW OFFICIAL INVOICE` button.
16. **About Us** (`/about`): Brand origin story, 3 brand pillars, and craftsmanship manifesto.
17. **Contact Us** (`/contact`): Dhaka studio address, phone/WhatsApp desk, and interactive inquiry submission form.
18. **FAQ** (`/faq`): Sizing, COD payment, delivery times, and printing questions.
19. **Shipping Policy** (`/shipping-policy`): Dhaka 24–48h (৳70), Nationwide 2–4 days (৳130), Free shipping over ৳2,500.
20. **Return & Refund Policy** (`/returns-policy`, `/refund-policy`): 7-Day size exchange policy guidelines.
21. **Privacy Policy** (`/privacy-policy`): Data handling, courier information transfer, and privacy protection.
22. **Terms and Conditions** (`/terms`): Website terms, Cash on Delivery purchase agreement, and usage rules.
23. **404 Not Found** (`*`): Branded error view with navigation escape routes.

---

## 8. Route Structure

All routes are declared in `src/App.tsx` using `react-router-dom`:
- Direct routes for collections (`/casual-clothing`, `/football-jerseys`, `/new-arrivals`, `/featured`) reuse `ShopPage` via preset props without code duplication.
- Route transitions automatically scroll to top using `<ScrollToTop />`.

---

## 9. Component Structure

- **`HeroBannerSlider`**: Independent, self-advancing carousel supporting touch gestures, keyboard navigation, darkness scrim, and a single CTA button.
- **`BrandLogo`**: Standardized presentation of the uploaded Eleven Nation logo.
- **`ProductCard`**: Responsive 4:5 image ratio, secondary image reveal on hover, wishlist toggle, stock indicator, and quick-add size drawer.
- **`CartDrawer`**: Global slide-over drawer accessible from any page with free shipping progress bar.
- **`SearchModal`**: Global search modal triggered via header search icon or keyboard `/`.

---

## 10. Hero Banner System (Editorial Campaign Slider)

- **Visual Direction**: Editorial campaign fashion photography with full-width bright imagery; no heavy dark filters or muddy backgrounds.
- **Single CTA Rule**: Strictly one high-contrast call to action button (`button_text`, default `EXPLORE COLLECTION`, linking to `/shop`) per slide to maintain uncluttered focus.
- **Integrated Negative Space Typography**: HTML text is rendered directly over negative space using absolute positioning with fine-tuned text shadows, preserving full editability from the future admin management portal without baking text into images.
- **Independent Viewport Positioning**: Fine-tuned control over horizontal (`left` | `center` | `right`) and vertical (`top` | `center` | `bottom`) positioning separately for desktop and mobile devices.
- **Automatic Sliding**: 4.5s autoplay intervals that transition smoothly without user interaction, automatically pausing on desktop mouse hover or keyboard focus, and resuming gracefully.
- **Mobile Touch Gestures**: Native touch swipe detection (`onTouchStart`, `onTouchMove`, `onTouchEnd`) with 50px delta thresholds.
- **Responsive Media & Focal Points**: Supports separate desktop and mobile image URLs as well as configurable CSS `object-position` (`image_position_desktop` / `image_position_mobile`).
- **Minimal Scrim**: Default overlay opacity of 0% to 10% (0.06–0.08) ensures image brightness while maintaining WCAG AA contrast for text.
- **Controls**: Minimalist hairline navigation arrows and slim indicator progress bars that stay unobtrusive.

---

## 11. Banner Data Model

```typescript
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
  // Positioning & Alignment
  text_horizontal_position?: 'left' | 'center' | 'right';
  text_vertical_position?: 'top' | 'center' | 'bottom';
  mobile_text_horizontal_position?: 'left' | 'center' | 'right';
  mobile_text_vertical_position?: 'top' | 'center' | 'bottom';
  text_alignment?: 'left' | 'center' | 'right'; // legacy alias
  // Typography & Styling
  heading_color?: string;
  subtitle_color?: string;
  heading_size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  text_max_width?: string;
  text_shadow?: 'none' | 'subtle' | 'medium' | 'strong';
  // Visual Overlays & Focal Positions
  overlay_opacity: number; // 0.0 to 1.0 (default 0.06–0.08)
  image_position_desktop?: string; // e.g. 'center right', 'center center'
  image_position_mobile?: string;
  image_position?: string; // legacy alias
  transition_type?: 'fade' | 'slide';
  sort_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
  badge?: string;
}
```

---

## 12. Product Data Model

Supports standard attributes plus deep metadata for both Casual Wear and Football Jerseys:
- **Casual Clothing**: Material, fit, GSM weight (260–400), care instructions.
- **Football Jerseys**: Team name, season, league, jersey type (Home/Away/Third/Special), edition (Fan/Player), default squad players, and custom printing availability.

---

## 13. Shopping Cart Logic

- **Persistence**: Synced with browser `localStorage` (`eleven_nation_cart_v1`).
- **Composite Key**: `productId-variantId-[customizationHash]` guarantees separate line items for identical sizes with different custom player names.
- **Stock Guard**: Quantity steppers cannot exceed variant stock.

---

## 14. Checkout Logic

- **Fields**: Full Name, 11-digit Bangladeshi Phone, Email (optional), District, Area/Thana, Full Address, Delivery Instructions.
- **Delivery Calculation**:
  - Inside Dhaka: ৳70
  - Outside Dhaka: ৳130
  - Free delivery on orders ৳2,500 and above.
- **Payment**: Cash on Delivery (COD).

---

## 15. Supabase Architecture

- Clean client initialization in `src/lib/supabase.ts` with `isSupabaseConfigured` fallback checks.
- When `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are provided, the service layer queries live Supabase tables without modifying UI components.

---

## 16. Database Table Descriptions

1. `profiles`: Customer accounts linked to `auth.users(id)`.
2. `user_roles`: Role separation (`customer`, `admin`, `manager`).
3. `categories`: Collection metadata.
4. `products`: Base catalog items and prices.
5. `product_variants`: Variant-level inventory per Size + Color.
6. `product_images`: Multi-image galleries with order.
7. `banners`: Homepage hero carousel records.
8. `addresses`: Customer shipping book.
9. `orders`: Orders placed via Cash on Delivery.
10. `order_items`: Line item price & customization snapshots.
11. `order_status_history`: Audit trail for status changes.
12. `inventory_movements`: Stock deduction & replenishment logs.
13. `notifications`: In-app customer messages.
14. `coupons`: Discount codes with limits.
15. `site_settings`: Global configuration JSON.

---

## 17. Database Relationships

See detailed Mermaid ER diagram in `database/ER_DIAGRAM.md`.

---

## 18. SQL File References

- `database/sql/001_initial_schema.sql`
- `database/sql/002_seed_demo_data.sql`
- `database/sql/003_storage_setup.sql`

---

## 19. API / Service Architecture

All interactions flow through dedicated service modules in `src/services/`:
- `productService.ts`
- `categoryService.ts`
- `bannerService.ts`
- `cartService.ts`
- `orderService.ts`
- `authService.ts`

---

## 20. Authentication Plan

- Current: Local simulation with pre-seeded demo user (`mahadihassanrafi2007@gmail.com`).
- Production: Supabase Auth (`signInWithPassword`, `signUp`, `resetPasswordForEmail`).

---

## 21. Customer Permissions

- Customers can read/update only their own profiles, addresses, and orders.
- Customers cannot update roles or read other customers' orders.

---

## 22. Future Admin Website Requirements

The separate Admin Website will connect to the same Supabase project and will manage:
1. Products & Variants (add, edit, stock adjustments, pricing).
2. Homepage Hero Banners (upload images, reorder, schedule dates, edit single CTA link).
3. Orders (view incoming COD orders, phone verification notes, status updates).
4. Categories & Taxonomy.
5. Coupons & Global Site Settings.

---

## 23. Image Storage Plan

Supabase Storage Buckets configured in `database/sql/003_storage_setup.sql`:
- `product-images`: Public read, Admin write.
- `banner-images`: Public read, Admin write.
- `avatar-images`: Public read, User write (own folder).

---

## 24. Security Requirements

- Never store Supabase `service_role` key in frontend code.
- Enforce RLS on all tables.
- Validate orders and recalculate prices server-side via Supabase Edge Function prior to recording in `orders`.

---

## 25. Environment Variables

Defined in `.env.example`:
- `VITE_SUPABASE_URL`: Supabase project URL.
- `VITE_SUPABASE_ANON_KEY`: Supabase anon/public key.

---

## 26. Deployment Plan

- Frontend: Vercel, Netlify, or Cloud Run.
- Database: Managed Supabase Cloud (Singapore or Mumbai region for low latency to Bangladesh).
- DNS: Custom domain `elevennation.shop` pointing to frontend deployment with SSL.

---

## 27. SEO Plan

- Canonical meta tags, OpenGraph tags, and Twitter Cards configured in `index.html`.
- Clean URLs (`/casual-clothing`, `/football-jerseys`, `/new-arrivals`, `/product/:slug`).
- Semantic HTML tags (`<header>`, `<main>`, `<article>`, `<footer>`).

---

## 28. Future Development Roadmap

1. **Phase 2 (Current)**: Customer Website complete with multi-banner slider, 23 routes, demo checkout, and comprehensive SQL/documentation.
2. **Phase 3**: Supabase project creation, SQL deployment, live authentication, and secure checkout edge function.
3. **Phase 4**: Standalone Admin Management application.

---

## 29. Completed Features

- Reusable dynamic Hero Banner Slider with touch gestures, auto-slide, and single CTA.
- 23 customer pages and clean routes.
- Variant-level stock selection.
- Football jersey customization with real-time live mockup preview.
- Slide-out cart drawer and dedicated cart page.
- Cash on Delivery checkout with Bangladesh district calculation.
- Order confirmation with celebratory confetti.
- Public order tracking with milestone stepper.
- Customer account portal with orders and address book.
- Comprehensive database documentation and SQL files.

---

## 30. Pending Features (Phase 3 & 4)

- Real Supabase database connection and Edge Function deployment.
- SMS gateway integration (e.g. Greenweb / SSL Wireless) for automated OTP verification.
- Separate Admin Management Dashboard application.

---

## 31. Known Limitations

- In the current frontend prototype phase, checkout and order tracking operate via browser local storage and service simulation. Real order persistence will be activated when Supabase credentials are provided.

---

## 32. Instructions for Future Updates

- Always keep `PROJECT_BLUEPRINT.md` updated when modifying data models or adding routes.
- When creating new features, maintain the service layer abstraction in `src/services/` so UI components remain database-agnostic.
- Never add admin management routes (`/admin`) into this customer repository.
