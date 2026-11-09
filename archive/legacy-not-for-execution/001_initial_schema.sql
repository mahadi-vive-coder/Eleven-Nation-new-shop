-- =====================================================================
-- ELEVEN NATION — INITIAL DATABASE SCHEMA
-- Version: 1.0.0
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Core schema, tables, constraints, indexes & RLS policies
-- =====================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. UTILITY FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------

-- Automatic updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 2. USER ROLES & PROFILES
-- ---------------------------------------------------------------------

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_modtime
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- User roles table (Prevents role-injection attacks; separated from profiles)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'admin', 'manager', 'support')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Security helper function to verify admin status safely in RLS
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = $1 AND role IN ('admin', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 3. CATEGORIES & TAXONOMY
-- ---------------------------------------------------------------------

CREATE TABLE categories (
    id TEXT PRIMARY KEY, -- 'casual', 'jerseys'
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    item_count INT NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_categories_modtime
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------
-- 4. BANNERS (HERO BANNER SLIDER SYSTEM)
-- ---------------------------------------------------------------------

CREATE TABLE banners (
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

CREATE TRIGGER update_banners_modtime
BEFORE UPDATE ON banners
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_banners_active_sort ON banners (is_active, sort_order);

-- ---------------------------------------------------------------------
-- 5. PRODUCTS
-- ---------------------------------------------------------------------

CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL UNIQUE,
    subtitle TEXT,
    short_description TEXT,
    description TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    subcategory TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'standard',
    base_price NUMERIC(10,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price NUMERIC(10,2) CHECK (compare_at_price >= base_price),
    discount_percentage INT,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    in_stock BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    tags TEXT[] DEFAULT '{}',
    -- Jersey specific details
    jersey_team_name TEXT,
    jersey_season TEXT,
    jersey_league TEXT,
    jersey_type TEXT CHECK (jersey_type IN ('Home', 'Away', 'Third', 'Special Edition', NULL)),
    jersey_edition TEXT CHECK (jersey_edition IN ('Fan Edition', 'Player Edition', NULL)),
    jersey_allow_customization BOOLEAN NOT NULL DEFAULT FALSE,
    jersey_customization_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    jersey_default_players JSONB DEFAULT '[]'::jsonb,
    -- Casual specific details
    casual_material TEXT,
    casual_fit TEXT,
    casual_gsm INT,
    casual_care_instructions TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_products_modtime
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_products_category ON products (category_id, is_active);
CREATE INDEX idx_products_slug ON products (slug);
CREATE INDEX idx_products_featured ON products (is_featured, is_active);
CREATE INDEX idx_products_new_arrival ON products (is_new_arrival, is_active);

-- ---------------------------------------------------------------------
-- 6. PRODUCT IMAGES
-- ---------------------------------------------------------------------

CREATE TABLE product_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_images_product ON product_images (product_id, sort_order);

-- ---------------------------------------------------------------------
-- 7. PRODUCT VARIANTS (SIZE & COLOR COMBINATIONS)
-- ---------------------------------------------------------------------

CREATE TABLE product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color_name TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku TEXT NOT NULL UNIQUE,
    price_modifier NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color_name)
);

CREATE TRIGGER update_product_variants_modtime
BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_variants_product ON product_variants (product_id);

-- ---------------------------------------------------------------------
-- 8. CUSTOMER ADDRESSES
-- ---------------------------------------------------------------------

CREATE TABLE addresses (
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

CREATE TRIGGER update_addresses_modtime
BEFORE UPDATE ON addresses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_addresses_user ON addresses (user_id);

-- ---------------------------------------------------------------------
-- 9. ORDERS & ORDER ITEMS
-- ---------------------------------------------------------------------

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Guest checkout supported
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
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery' CHECK (payment_method IN ('Cash on Delivery', 'bKash', 'Nagad', 'Card')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_orders_modtime
BEFORE UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_orders_number ON orders (order_number);
CREATE INDEX idx_orders_user ON orders (user_id);
CREATE INDEX idx_orders_phone ON orders (customer_phone);
CREATE INDEX idx_orders_status ON orders (status);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name TEXT NOT NULL,
    product_image TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    variant_sku TEXT NOT NULL,
    -- Jersey Customization Snapshot
    custom_name TEXT,
    custom_number TEXT,
    customization_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- Order status transition audit trail
CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. INVENTORY MOVEMENTS (AUDIT TRAIL FOR STOCK DEDUCTION)
-- ---------------------------------------------------------------------

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id TEXT NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    quantity_change INT NOT NULL, -- Negative for sales, positive for restocks
    movement_type TEXT NOT NULL CHECK (movement_type IN ('order_placed', 'order_cancelled', 'manual_restock', 'return_restock')),
    reference_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_variant ON inventory_movements (variant_id);

-- ---------------------------------------------------------------------
-- 11. NOTIFICATIONS & COUPONS
-- ---------------------------------------------------------------------

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_discount_amount NUMERIC(10,2),
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 12. SITE SETTINGS
-- ---------------------------------------------------------------------

CREATE TABLE site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

-- Enable RLS across all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles: Users read and update only their own profile
CREATE POLICY "Profiles are viewable by owner" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles can be updated by owner" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- 2. User Roles: Non-admins cannot alter roles
CREATE POLICY "Users can view their own roles" ON user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to roles" ON user_roles
    FOR ALL USING (is_admin(auth.uid()));

-- 3. Categories: Public can view active categories; Admin manages
CREATE POLICY "Public can view active categories" ON categories
    FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage categories" ON categories
    FOR ALL USING (is_admin(auth.uid()));

-- 4. Banners: Public can view active banners in schedule; Admin manages
CREATE POLICY "Public can view active scheduled banners" ON banners
    FOR SELECT USING (
        (is_active = TRUE AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW()))
        OR is_admin(auth.uid())
    );

CREATE POLICY "Admins can manage banners" ON banners
    FOR ALL USING (is_admin(auth.uid()));

-- 5. Products, Variants & Images: Public read active; Admin manage
CREATE POLICY "Public can view active products" ON products
    FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));

CREATE POLICY "Admins can manage products" ON products
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view product images" ON product_images
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage product images" ON product_images
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Public can view product variants" ON product_variants
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage product variants" ON product_variants
    FOR ALL USING (is_admin(auth.uid()));

-- 6. Addresses: Customer only access
CREATE POLICY "Customers can manage their own addresses" ON addresses
    FOR ALL USING (auth.uid() = user_id);

-- 7. Orders & Items: Customers read own orders; Admins manage; Guests verified via RPC
CREATE POLICY "Customers can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));

CREATE POLICY "Customers can view items of their orders" ON order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin(auth.uid())))
    );

CREATE POLICY "Admins can manage all orders" ON orders
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "Admins can manage all order items" ON order_items
    FOR ALL USING (is_admin(auth.uid()));

-- 8. Coupons & Site Settings
CREATE POLICY "Public can read active coupons" ON coupons
    FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));

CREATE POLICY "Public can read site settings" ON site_settings
    FOR SELECT USING (TRUE);

CREATE POLICY "Admins can manage site settings" ON site_settings
    FOR ALL USING (is_admin(auth.uid()));
