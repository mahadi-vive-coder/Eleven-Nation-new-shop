# Changelog

All notable changes to the **ELEVEN NATION** customer website will be documented in this file.

---

## [1.6.0] - 2026-11-06 (Data-Driven Dynamic Color Filter)

### Data-Driven Dynamic Color Filter Architecture
- **Admin Panel Alignment & Optional Color Support**:
  - Products now support optional assigned colors (`colors?: string[]`, `available_colors?: string[]`).
  - Color selection is strictly non-mandatory: if an admin leaves the color field empty, the product has no assigned color values (`colors: []`).
- **Dynamic Frontend Filter Behavior**:
  - The Color filter in the "Filter Products" sidebar automatically inspects product data in the currently active category or listing.
  - **Dynamic Visibility**: If at least one relevant product has an assigned color, the Color filter accordion is displayed. If no relevant products have assigned colors, the Color filter section is completely hidden.
  - **Zero Empty Options**: Options only list unique non-empty colors present on relevant products in the current listing.
  - **Accurate Filtering**: Selecting a color filters the grid to show only products matching that color. Deselecting or clicking again clears the filter.
  - **Auto-Sync / Auto-Clear**: Automatically resets any active color selection if the user switches to a category or subcategory where that color does not exist.
- **Universal Category Compatibility**:
  - Operates dynamically across Casual Clothing, Football Jerseys, National Teams, Club Teams, Retro Drops, and Search Results without any hardcoded category checks.
- **Preserved Filter Products UI Design**:
  - Retains the exact approved design system: accordion header with chevron toggle, radio-button styling with subtle color swatch dots, active filter pills with dismiss icon, and mobile filter drawer integration.

---

## [1.5.0] - 2026-11-06 (Approved Standalone HTML Invoice Integration)

### Standalone HTML Invoice Template Integration
- **Approved Design Faithfully Preserved**: Converted the user-provided standalone HTML invoice template (`deepseek_html_20261106_91e40d_122392f8.html`) into a production React component (`OrderInvoice.tsx`) matching the exact layout, colors, typography, tables, and borders:
  - Scoped CSS architecture (`.en-invoice-scope`) ensuring zero style leaks into the rest of the application.
  - Multi-tone brand rule (deep olive `#1E2618`, olive `#4A5A40`, sage `#8A927A`, warm gold `#B08A4A`).
  - Editorial masthead with text-only brandmark (`ELEVEN NATION`), verified invoice badge, and meta grid.
  - Dual customer and order info cards with clean tabular data and delivery instructions.
  - Full line-item table including product names, SKU tags, sizes, jersey customization callouts (Player name & number), unit pricing, quantities, and line totals.
  - Payment details stack (Cash on Delivery badge, courier tracking reference, Bangladesh shipping terms) and exact financial summary (Subtotal, Jersey Customization charge, Delivery charge, Discount, Grand Total).
  - Authentic invoice footer with signature section, return policy summary (7-Day size exchange), customer support channels (`support@elevennation.shop`, `+880 1712-345678`), and official domain (`elevennation.shop`).

### Seamless Multi-Point Access & Printing
- **Dedicated Route (`/invoice/:orderNumber`)**:
  - Full-screen standalone invoice view with dedicated print and copy-link toolbar (`no-print`).
  - Supports `?print=true` URL query parameter for automated browser print dialog trigger upon loading.
  - Clean layout isolating the invoice by cleanly omitting header, footer, and announcement bar on this route.
- **Order Confirmation Page Integration**:
  - Added primary `VIEW INVOICE` and `PRINT INVOICE` actions in both the order confirmation meta bar and the bottom action row.
  - Modal overlay (`InvoiceModal.tsx`) with floating action toolbar and direct print trigger.
- **Customer Account / Order History Integration**:
  - Added `VIEW INVOICE` action to each order card in the "My Orders" tab on `AccountPage.tsx`.
- **Order Tracking Integration**:
  - Added `VIEW OFFICIAL INVOICE` button to the shipment record header in `OrderTrackingPage.tsx`.
- **Print & PDF Perfection**:
  - Configured `@media print` rules: exact A4 portrait dimensions, clean white print background, hiding all interactive controls (`.no-print`, modal backdrop, buttons, nav), and table row break-inside protection (`page-break-inside: avoid`).

---

## [1.4.0] - 2026-11-06 (Complete Site-Wide Consistency & Newsletter Elimination)

### Complete Site-Wide UI/UX Consistency
- **Universal Component Modernization**: Applied the finalized ELEVEN NATION Premium Editorial Streetwear design system with soft rounded corners (`rounded-2xl`, `rounded-xl`, `rounded-full`) across EVERY page and component in the codebase:
  - **Homepage**: Container-framed hero banner slider, 4-column KPI trust strip, category banners, new arrivals, featured campaigns, best sellers, and manifesto.
  - **Header & Navigation**: Neutral `#F5F3EE` announcement bar, embedded rounded search pill, 5 canonical nav links with active pill state (`bg-[#EAE6DF] rounded-full`), and circular action icons.
  - **Shop & Category Pages**: Decorative olive bar (`w-10 h-1 bg-[#8A927A] rounded-full`), `ALL PRODUCTS` Manrope title, rounded pill sort dropdown, 4-column responsive product grid, left sidebar with radio Category/Size filters (color filter strictly eliminated).
  - **Product Cards**: Soft rounded corners (`rounded-2xl`), neutral pedestal backdrop, circular wishlist button (`rounded-full`), pill badges (`rounded-full`), and pill quick size selectors.
  - **Product Detail View**: Rounded-2xl gallery frame, rounded-full pill buttons for stepper, Add to Bag, Instant Buy with COD, circular wishlist, and strict jersey-only customization rule.
  - **Cart Drawer & Cart Page**: Rounded-2xl container and cards, rounded-xl product image thumbnails, rounded-full progress bar, rounded-full steppers, and pill checkout buttons.
  - **Checkout Page**: Rounded-2xl sections and order review card, rounded-xl inputs and select dropdowns, rounded-xl COD payment method container, and rounded-full Confirm Order CTA.
  - **Order Confirmation Page**: Rounded-2xl receipt card, rounded-xl customer and delivery destinations, rounded-lg item thumbnails, rounded-full print receipt button, and rounded-full Continue Shopping CTA.
  - **Account & Auth Pages**: Rounded-2xl portal cards, rounded-xl input fields and address cards, rounded-full badges and submit buttons across Account, Login, Register, and Forgot Password.
  - **Support & Utility Pages**:
    - `OrderTrackingPage`: Added decorative olive bar, rounded-2xl tracking search and result cards, rounded-xl inputs, and rounded-full demo pills and track button.
    - `ContactPage`: Added decorative olive bar, rounded-2xl channel cards and contact form, rounded-full channel badges, rounded-xl inputs, and rounded-full submit button.
    - `AboutPage`: Rounded-2xl brand pillar cards and imagery, rounded-full CTA buttons.
    - `PoliciesPage`: Added decorative olive bar, rounded-full policy tabs, rounded-2xl policy panels, rounded-xl delivery fee comparison cards and FAQ accordions.
    - `SearchModal` & `SizeGuideModal`: Rounded-2xl modal dialogs, rounded-full pill tabs, and rounded-full tags.

### Complete Removal of Newsletter / Subscription Block
- **Total Elimination**: Completely removed the newsletter section, its state variables (`newsletterEmail`, `subscribed`), handler (`handleSubscribe`), heading (`JOIN THE ELEVEN NATION CIRCLE`), description (`Receive early access to limited kit releases...`), email input, and subscribe button (`SUBSCRIBE →`) from `Footer.tsx` and all references across the codebase.
- **Zero Residual Whitespace**: The footer layout now transitions cleanly and harmoniously directly into the brand bio, category links, customer care, and legal/trust sections without any blank gaps or layout awkwardness.

---

## [1.3.0] - 2026-11-05 (Visual Benchmark Alignment & Rounded Pill Design System)

### Brand Identity & Reference Alignment
- **Text-Only Logo**: Replaced all graphic/image logos with 100% pure HTML text (`ELEVEN` stacked over `NATION`) in bold Manrope typography.
- **Top Announcement Bar**: Neutral `#F5F3EE` strip with Truck icon (Free delivery on orders over ৳2,500), Shield icon (Cash on Delivery Available), and right-aligned utility links (`Track Order | Help | Contact`).
- **Main Navigation**: Clean desktop navigation with 5 required links: `Home`, `Shop ▾`, `Casual Wear ▾`, `Football Jerseys ▾`, `About Us`, with active pill background (`bg-[#EAE6DF] rounded-full px-4 py-1.5`).
- **Embedded Search Pill**: Integrated header search bar with rounded pill shape (`rounded-full bg-[#EFECE6]/80 border border-[#D8D4CA]`).
- **Hero Banner Redesign**: Framed within container margins with `rounded-[28px]` / `rounded-3xl` corners, headline `WEAR YOUR IDENTITY.` with olive accent, kicker `SHOP OUR COLLECTION`, pill CTA `EXPLORE COLLECTION` (`rounded-full bg-[#8A927A]`), and bottom-right pill slide indicators.
- **Shop Catalog Redesign**:
  - Decorative olive bar (`w-10 h-1 bg-[#8A927A] rounded-full`) above `ALL PRODUCTS` title.
  - Subtitle: `Discover the best of Eleven Nation`.
  - Right: `Sort by: Featured ▾` rounded pill dropdown (`rounded-full border border-[#D8D4CA]`).
  - Left Filter Sidebar: Soft rounded card (`rounded-2xl`) with Category radio options (`All Products`, `Casual Clothing`, `Football Jerseys`), Size radio options (`S`, `M`, `L`, `XL`, `XXL`), price range slider, and rounded pill `Clear Filters` button.
  - **Color Filter Removed**: Strictly eliminated color filter from customer-facing shop filters, desktop sidebar, and active tags.
  - 4-column product grid with soft rounded cards (`rounded-2xl`).
- **Strict Jersey Customization Rule**: Enforced that name/number customization preview and inputs only display for actual football jerseys, never on casual items, hoodies, tees, polos, or football pants/shorts.
- **Universal Pill Buttons**: Standardized rounded pill style (`rounded-full`) across all buttons site-wide.

---

## [1.2.0] - 2026-11-05 (Complete UI/UX Design System Redesign — Premium Editorial Streetwear)

### Visual Identity & Design System
- **Selected Direction**: `PREMIUM EDITORIAL STREETWEAR` with `SUBTLE` accent preference.
- **Typography Engine**:
  - Implemented `Manrope` (`font-display`) for high-impact headlines, editorial titles, and price totals.
  - Implemented `DM Sans` (`font-sans`) for clean, highly legible body copy, descriptions, specifications, and form fields.
  - Standardized `tabular-nums` for precise alignment of prices (BDT ৳), phone numbers, and dates.
- **Official Colour System**:
  - Primary Background: Warm Off-white (`#F5F3EE`) across body, inputs, and image pedestals.
  - Primary Text: Deep Black (`#171717`) for high-contrast headlines and primary button states.
  - Card Surfaces: Pure White (`#FFFFFF`) with Soft Border (`#D8D4CA`).
  - Secondary Text: Muted Stone (`#77746D`).
  - Subtle Accent: Muted Olive (`#8A927A` / hover `#788069`) for badges, rating stars, and subtle interactive states.
  - Functional Feedback: Accessible Muted Green (`#42634B`), Restrained Dark Red (`#8B2E2E`), and Muted Amber (`#A16E3B`).

### Component & Page Redesign
- **Layout & Navigation**:
  - Redesigned `TopAnnouncementBar` in Deep Black with Soft Border dividers and Muted Olive accents.
  - Redesigned `Header` with Warm Off-white background, hairline borders, clean uppercase navigation, and redesigned mobile menu drawer.
  - Redesigned `Footer` with editorial typography, newsletter subscription, and clear corporate trust markings.
- **Storefront & Catalog**:
  - Redesigned `HeroBannerSlider` with campaign-style headline typography, kicker tag, and strict single CTA button.
  - Redesigned `ProductCard` with pure white background, hover elevation, quick size selection drawer, stock indicators, and wishlist triggers.
  - Redesigned `HomePage` with refined category grid, Just Landed gallery, Deep Black Casual Wear showcase, and editorial brand manifesto.
  - Redesigned `ShopPage` with desktop filter sidebar, price range slider, swatch selectors, mobile slide-over sheet, and active filter tags.
  - Redesigned `ProductDetailPage` with image pedestals, live jersey back custom print preview in brand typography, and tabbed specifications.
- **Checkout & Utilities**:
  - Redesigned `CartDrawer`, `CartPage`, and `CheckoutPage` with structured 3-zone form layout and transparent COD calculations.
  - Redesigned `OrderConfirmationPage` with updated confetti palette, receipt summary, and order tracking link.
  - Redesigned `OrderTrackingPage` with real-time consignment stepper and status badges.
  - Redesigned `AccountPage`, `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `AboutPage`, `ContactPage`, `PoliciesPage`, and `NotFoundPage`.

---

## [1.1.0] - 2026-11-04 (Architecture & Master Prompt Update)

### Added
- **Multi-Banner Hero Slider**:
  - Implemented dynamic, auto-sliding `HeroBannerSlider` supporting multiple banners.
  - Configured strictly **ONE CTA BUTTON** on each banner (default `EXPLORE COLLECTION` linking to `/shop`).
  - Added touch swipe detection for mobile screens.
  - Added slide indicator dots and previous/next navigation arrows with auto-hide logic for single banners.
  - Added configurable overlay darkness opacity (`overlay_opacity`) and desktop/mobile image swapping.
- **Canonical Routing & 23 Customer Pages**:
  - Added direct canonical routes: `/casual-clothing`, `/football-jerseys`, `/new-arrivals`, `/featured`, `/profile`, `/orders`, `/faq`, `/shipping-policy`, `/returns-policy`, `/privacy-policy`, `/terms`.
  - Added dedicated branded 404 Not Found page (`NotFoundPage.tsx`).
- **Database & Supabase Documentation Package**:
  - Created `/database/README.md`.
  - Created `/database/sql/001_initial_schema.sql` (15 tables, constraints, indexes, triggers, and Row Level Security policies).
  - Created `/database/sql/002_seed_demo_data.sql` (sample categories, products, banners, site settings, coupons).
  - Created `/database/sql/003_storage_setup.sql` (buckets for product-images, banner-images, avatars with access policies).
  - Created `/database/migrations/README.md`.
  - Created `/database/ER_DIAGRAM.md` with visual Mermaid diagram and relational constraint definitions.
- **Permanent Master Documentation**:
  - Created `PROJECT_BLUEPRINT.md` containing all 32 required architectural sections.
  - Created `SECURITY.md` detailing security architecture and RLS specifications.
  - Updated `README.md`.

---

## [1.0.0] - 2026-11-04 (Initial Customer Storefront Release)

### Added
- Initial project structure with React, TypeScript, Tailwind CSS, and Vite.
- Official Eleven Nation brand identity with uploaded logo asset integration.
- Product catalog system with casual wear (260–400 GSM) and football kits.
- Football jersey customization module with live player name and number preview.
- Shopping cart drawer and dedicated cart page with localStorage persistence.
- Cash on Delivery checkout with Bangladesh district delivery fee calculation.
- Order confirmation page with celebratory confetti.
- Public order tracking system with consignment progress stepper.
- Customer account portal with profile editor and address book.
