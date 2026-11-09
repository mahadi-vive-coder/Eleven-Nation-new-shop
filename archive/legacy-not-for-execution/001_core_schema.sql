-- =====================================================================
-- ELEVEN NATION — 001 CORE SCHEMA
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Core tables, constraints, foreign keys, indexes, and modtime triggers
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. USER PROFILES, RBAC & AUDIT LOGS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_profiles_modtime ON profiles;
CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User Roles (RBAC)
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'super_admin', 'order_manager', 'product_manager', 'content_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Admin Activity Logs for audit trails
CREATE TABLE IF NOT EXISTS admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_admin ON admin_activity_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON admin_activity_logs (resource_type, resource_id);

-- ---------------------------------------------------------------------
-- 2. DYNAMIC CATEGORY HIERARCHY (SELF-REFERENCING TREE)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    description TEXT,
    image_url TEXT,
    item_count INT NOT NULL DEFAULT 0 CHECK (item_count >= 0),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_categories_modtime ON categories;
CREATE TRIGGER update_categories_modtime
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories (parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON categories (is_active, sort_order);

-- ---------------------------------------------------------------------
-- 3. PRODUCTS, IMAGES & VARIANTS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    short_description TEXT,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
    subcategory TEXT NOT NULL, -- Legacy flat subcategory slug compatibility
    product_type TEXT NOT NULL DEFAULT 'standard' CHECK (product_type IN ('casual', 'jersey', 'standard')),
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price NUMERIC(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= base_price),
    discount_percentage INT DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    low_stock_threshold INT NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    tags TEXT[] DEFAULT '{}',
    colors TEXT[] DEFAULT '{}', -- Optional assigned colors: empty array [] when non-mandatory
    available_sizes TEXT[] DEFAULT '{"S","M","L","XL","XXL"}',
    -- Football Jersey Specific Attributes
    jersey_team_name TEXT,
    jersey_season TEXT,
    jersey_league TEXT,
    jersey_type TEXT CHECK (jersey_type IN ('Home', 'Away', 'Third', 'Special Edition', NULL)),
    jersey_edition TEXT CHECK (jersey_edition IN ('Fan Edition', 'Player Edition', NULL)),
    jersey_allow_customization BOOLEAN NOT NULL DEFAULT FALSE,
    jersey_customization_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (jersey_customization_price >= 0),
    jersey_default_players JSONB DEFAULT '[]'::jsonb,
    -- Casual Wear Specific Attributes
    casual_material TEXT,
    casual_fit TEXT,
    casual_gsm INT CHECK (casual_gsm IS NULL OR casual_gsm > 0),
    casual_care_instructions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_products_modtime ON products;
CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_category ON products (category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON products (subcategory_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products (is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products (is_new_arrival, is_active);
CREATE INDEX IF NOT EXISTS idx_products_best_seller ON products (is_best_seller, is_active);

-- Product Image Gallery
CREATE TABLE IF NOT EXISTS product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images (product_id, sort_order);

-- Product Variants with Dedicated Stock Per Size & Color Combination
CREATE TABLE IF NOT EXISTS product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color_name TEXT, -- Non-mandatory: can be empty string or NULL
    color_hex TEXT,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku TEXT NOT NULL UNIQUE,
    price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, sku)
);

DROP TRIGGER IF EXISTS update_product_variants_modtime ON product_variants;
CREATE TRIGGER update_product_variants_modtime
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants (product_id);
CREATE INDEX IF NOT EXISTS idx_variants_stock ON product_variants (stock);

-- ---------------------------------------------------------------------
-- 4. CUSTOMER ADDRESSES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    district TEXT NOT NULL,
    area TEXT NOT NULL,
    full_address TEXT NOT NULL,
    delivery_instructions TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_addresses_modtime ON addresses;
CREATE TRIGGER update_addresses_modtime
BEFORE UPDATE ON addresses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses (user_id);

-- ---------------------------------------------------------------------
-- 5. ORDERS, LINE ITEMS & AUDIT TIMELINE
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for Guest Checkout
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    delivery_district TEXT NOT NULL,
    delivery_area TEXT NOT NULL,
    delivery_full_address TEXT NOT NULL,
    delivery_instructions TEXT,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    delivery_charge NUMERIC(10,2) NOT NULL CHECK (delivery_charge >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    coupon_code TEXT,
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery' CHECK (payment_method IN ('Cash on Delivery', 'bKash', 'Nagad', 'Card')),
    payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid', 'Partially Paid', 'Refunded')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
    stock_restored BOOLEAN NOT NULL DEFAULT FALSE, -- Guards against duplicate restocks
    customer_notes TEXT,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_orders_modtime ON orders;
CREATE TRIGGER update_orders_modtime
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_orders_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at DESC);

-- Immutable Order Line Item Snapshots
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT,
    variant_sku TEXT NOT NULL,
    custom_name TEXT,
    custom_number TEXT,
    customization_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- Order Status Progression History
CREATE TABLE IF NOT EXISTS order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_history_order ON order_status_history (order_id);

-- ---------------------------------------------------------------------
-- 6. COURIER INTEGRATION (STEADFAST BD & MULTI-CARRIER ARCHITECTURE)
-- ---------------------------------------------------------------------

-- Publicly safe courier provider directory
CREATE TABLE IF NOT EXISTS courier_providers (
    id TEXT PRIMARY KEY, -- 'steadfast', 'pathao', 'redx'
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    tracking_url_template TEXT, -- e.g. 'https://steadfast.com.bd/t/{consignment_id}'
    api_endpoint_base TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Separate, strictly secured table for sensitive API credentials (NEVER accessible to public)
CREATE TABLE IF NOT EXISTS courier_credentials (
    courier_id TEXT PRIMARY KEY REFERENCES courier_providers(id) ON DELETE CASCADE,
    api_key_encrypted TEXT NOT NULL,
    secret_key_encrypted TEXT NOT NULL,
    webhook_secret TEXT,
    additional_config JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courier Shipments & Consignment Tracking Lifecycle
CREATE TABLE IF NOT EXISTS courier_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    courier_provider_id TEXT NOT NULL REFERENCES courier_providers(id) ON DELETE RESTRICT,
    consignment_id TEXT NOT NULL, -- Steadfast consignment_id
    tracking_code TEXT, -- Steadfast tracking_code
    tracking_url TEXT,
    delivery_status TEXT NOT NULL DEFAULT 'in_review' CHECK (delivery_status IN ('in_review', 'pending', 'picked_up', 'in_transit', 'delivered', 'cancelled', 'returned')),
    cod_amount NUMERIC(10,2) NOT NULL CHECK (cod_amount >= 0),
    delivery_charge NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    courier_response_metadata JSONB DEFAULT '{}'::jsonb,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_courier_shipments_modtime ON courier_shipments;
CREATE TRIGGER update_courier_shipments_modtime
BEFORE UPDATE ON courier_shipments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_shipments_order ON courier_shipments (order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_consignment ON courier_shipments (consignment_id);

-- ---------------------------------------------------------------------
-- 7. INVOICE MANAGEMENT (PRINTABLE HTML TEMPLATE SUPPORT)
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE, -- e.g. 'EN-INV-28941'
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    customization_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_charge NUMERIC(10,2) NOT NULL CHECK (delivery_charge >= 0),
    discount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount >= 0),
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_invoices_modtime ON invoices;
CREATE TRIGGER update_invoices_modtime
BEFORE UPDATE ON invoices
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices (order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);

-- ---------------------------------------------------------------------
-- 8. INVENTORY MOVEMENTS AUDIT LOG
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    quantity_change INT NOT NULL, -- Negative for sales, positive for restocks
    movement_type TEXT NOT NULL CHECK (movement_type IN ('order_placed', 'order_cancelled', 'manual_restock', 'return_restock')),
    reference_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON inventory_movements (variant_id);

-- ---------------------------------------------------------------------
-- 9. CONFIGURABLE WEBSITE THEME, SECTIONS & SETTINGS
-- ---------------------------------------------------------------------

-- Global Store Settings (Configurable JSONB)
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Visual Theme Configuration
CREATE TABLE IF NOT EXISTS website_theme (
    id TEXT PRIMARY KEY DEFAULT 'default',
    logo_text TEXT NOT NULL DEFAULT 'ELEVEN NATION',
    logo_image_url TEXT,
    favicon_url TEXT,
    color_brand_bg TEXT NOT NULL DEFAULT '#F5F3EE',
    color_brand_text TEXT NOT NULL DEFAULT '#171717',
    color_brand_olive TEXT NOT NULL DEFAULT '#8A927A',
    color_brand_card TEXT NOT NULL DEFAULT '#FFFFFF',
    color_brand_border TEXT NOT NULL DEFAULT '#D8D4CA',
    color_brand_muted TEXT NOT NULL DEFAULT '#77746D',
    font_display TEXT NOT NULL DEFAULT 'Manrope',
    font_body TEXT NOT NULL DEFAULT 'DM Sans',
    announcement_text TEXT NOT NULL DEFAULT 'Free express delivery on orders over ৳2,500 across Bangladesh',
    announcement_is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_website_theme_modtime ON website_theme;
CREATE TRIGGER update_website_theme_modtime
BEFORE UPDATE ON website_theme
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Homepage Hero Banners
CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT NOT NULL,
    description TEXT,
    desktop_image_url TEXT NOT NULL,
    mobile_image_url TEXT NOT NULL,
    button_text TEXT NOT NULL DEFAULT 'EXPLORE COLLECTION',
    button_link TEXT NOT NULL DEFAULT '/shop',
    image_alt_text TEXT NOT NULL,
    text_horizontal_position TEXT NOT NULL DEFAULT 'left' CHECK (text_horizontal_position IN ('left', 'center', 'right')),
    text_vertical_position TEXT NOT NULL DEFAULT 'center' CHECK (text_vertical_position IN ('top', 'center', 'bottom')),
    mobile_text_horizontal_position TEXT NOT NULL DEFAULT 'left' CHECK (mobile_text_horizontal_position IN ('left', 'center', 'right')),
    mobile_text_vertical_position TEXT NOT NULL DEFAULT 'bottom' CHECK (mobile_text_vertical_position IN ('top', 'center', 'bottom')),
    heading_color TEXT NOT NULL DEFAULT '#FFFFFF',
    subtitle_color TEXT NOT NULL DEFAULT '#F0EFEB',
    heading_size TEXT NOT NULL DEFAULT 'xlarge' CHECK (heading_size IN ('compact', 'default', 'large', 'xlarge')),
    text_max_width TEXT NOT NULL DEFAULT 'max-w-2xl',
    text_shadow TEXT,
    overlay_opacity NUMERIC(3,2) NOT NULL DEFAULT 0.08 CHECK (overlay_opacity >= 0.0 AND overlay_opacity <= 1.0),
    image_position_desktop TEXT NOT NULL DEFAULT 'center center',
    image_position_mobile TEXT NOT NULL DEFAULT 'center center',
    transition_type TEXT NOT NULL DEFAULT 'fade' CHECK (transition_type IN ('fade', 'slide', 'zoom-fade')),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    badge TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_banners_modtime ON banners;
CREATE TRIGGER update_banners_modtime
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_banners_active_sort ON banners (is_active, sort_order);

-- Homepage Sections (Visibility & Sort Order)
CREATE TABLE IF NOT EXISTS homepage_sections (
    section_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    content_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Navigation Menu Management
CREATE TABLE IF NOT EXISTS navigation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    path TEXT NOT NULL,
    menu_location TEXT NOT NULL CHECK (menu_location IN ('header', 'footer_shop', 'footer_help', 'footer_legal')),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_navigation_location ON navigation_items (menu_location, is_active, sort_order);

-- Promotional Coupons
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (min_order_amount >= 0),
    max_discount_amount NUMERIC(10,2),
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0 CHECK (times_used >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer In-App Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, is_read);
