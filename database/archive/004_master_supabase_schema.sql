-- =====================================================================
-- ELEVEN NATION — COMPLETE MASTER SUPABASE DATABASE ARCHITECTURE
-- Version: 2.0.0
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Complete schema, tables, constraints, indexes, triggers,
--              functions, RLS policies, storage buckets & seed data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS & PREREQUISITES
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Utility function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 1. USER PROFILES, RBAC & AUDIT LOGGING
-- ---------------------------------------------------------------------

-- Customer and Admin Profiles linked to auth.users
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

-- Role-Based Access Control (RBAC)
-- Roles: 'customer', 'super_admin', 'order_manager', 'product_manager', 'content_manager'
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'super_admin', 'order_manager', 'product_manager', 'content_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

-- Security helper functions
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = $1 AND role IN ('super_admin', 'order_manager', 'product_manager', 'content_manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = $1 AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin Activity Logs for auditability
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

-- Dynamic tree supporting:
-- Clothing -> Subcategories
-- Jerseys -> National Teams (Argentina, Brazil, France) & Club Teams (Real Madrid, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    parent_id TEXT REFERENCES categories(id) ON DELETE RESTRICT,
    level INT NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5),
    description TEXT,
    image_url TEXT,
    item_count INT NOT NULL DEFAULT 0,
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
-- 3. PRODUCT CATALOG, VARIANTS & IMAGES
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
    colors TEXT[] DEFAULT '{}', -- Optional assigned colors (empty when none assigned)
    available_sizes TEXT[] DEFAULT '{"S","M","L","XL","XXL"}',
    -- Football Jersey Specifics
    jersey_team_name TEXT,
    jersey_season TEXT,
    jersey_league TEXT,
    jersey_type TEXT CHECK (jersey_type IN ('Home', 'Away', 'Third', 'Special Edition', NULL)),
    jersey_edition TEXT CHECK (jersey_edition IN ('Fan Edition', 'Player Edition', NULL)),
    jersey_allow_customization BOOLEAN NOT NULL DEFAULT FALSE,
    jersey_customization_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (jersey_customization_price >= 0),
    jersey_default_players JSONB DEFAULT '[]'::jsonb,
    -- Casual Wear Specifics
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

-- Product Variants with Individual Stock per Size and Color
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
-- 5. ORDERS, ORDER ITEMS & STATUS AUDIT
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS orders (
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
    coupon_code TEXT,
    grand_total NUMERIC(10,2) NOT NULL CHECK (grand_total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery' CHECK (payment_method IN ('Cash on Delivery', 'bKash', 'Nagad', 'Card')),
    payment_status TEXT NOT NULL DEFAULT 'Unpaid' CHECK (payment_status IN ('Unpaid', 'Paid', 'Partially Paid', 'Refunded')),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned')),
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

-- Historical Order Item Snapshots
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
-- 6. COURIER MANAGEMENT (MULTI-PROVIDER: STEADFAST, PATHAO, REDX)
-- ---------------------------------------------------------------------

-- Registry of courier providers in Bangladesh
CREATE TABLE IF NOT EXISTS courier_providers (
    id TEXT PRIMARY KEY, -- 'steadfast', 'pathao', 'redx', etc.
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    tracking_url_template TEXT, -- e.g. 'https://steadfast.com.bd/t/{consignment_id}'
    api_endpoint_base TEXT,
    api_credentials_encrypted JSONB DEFAULT '{}'::jsonb, -- Server-side only
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_courier_providers_modtime ON courier_providers;
CREATE TRIGGER update_courier_providers_modtime
BEFORE UPDATE ON courier_providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Individual order courier shipments and tracking lifecycle
CREATE TABLE IF NOT EXISTS courier_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    courier_provider_id TEXT NOT NULL REFERENCES courier_providers(id) ON DELETE RESTRICT,
    consignment_id TEXT NOT NULL,
    tracking_code TEXT,
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
-- 7. INVOICE MANAGEMENT (SUPPORTING PRINTABLE HTML INVOICE)
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
-- 9. WEBSITE CUSTOMIZATION, BANNERS & THEME CONFIGURATION
-- ---------------------------------------------------------------------

-- Global Store Settings
CREATE TABLE IF NOT EXISTS site_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Complete Visual Theme Configuration (Colors, Typography, Logo)
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

-- Homepage Hero Banners with Responsive Image Positions
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

-- Dynamic Homepage Sections (Visibility & Ordering)
CREATE TABLE IF NOT EXISTS homepage_sections (
    section_key TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    content_json JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dynamic Navigation Menu Management
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
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_discount_amount NUMERIC(10,2),
    usage_limit INT,
    times_used INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 10. DATABASE FUNCTIONS: INVENTORY & SECURE ATOMIC ORDER CREATION
-- ---------------------------------------------------------------------

-- Secure atomic order placement function with stock decrement
CREATE OR REPLACE FUNCTION place_order_atomic(
    p_order_number TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_delivery_district TEXT,
    p_delivery_area TEXT,
    p_delivery_full_address TEXT,
    p_delivery_instructions TEXT,
    p_delivery_charge NUMERIC,
    p_discount NUMERIC,
    p_coupon_code TEXT,
    p_customer_notes TEXT,
    p_items JSONB -- Array of { productId, variantId, quantity, customName, customNumber }
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_user_id UUID := auth.uid();
    v_item JSONB;
    v_variant RECORD;
    v_product RECORD;
    v_subtotal NUMERIC(10,2) := 0.00;
    v_customization_total NUMERIC(10,2) := 0.00;
    v_grand_total NUMERIC(10,2) := 0.00;
    v_unit_price NUMERIC(10,2);
    v_line_total NUMERIC(10,2);
    v_custom_price NUMERIC(10,2);
    v_qty INT;
    v_inv_num TEXT;
BEGIN
    -- 1. Create order record with provisional 0 subtotal
    INSERT INTO orders (
        order_number, user_id, customer_name, customer_phone, customer_email,
        delivery_district, delivery_area, delivery_full_address, delivery_instructions,
        subtotal, delivery_charge, discount, coupon_code, grand_total, customer_notes, status
    ) VALUES (
        p_order_number, v_user_id, p_customer_name, p_customer_phone, p_customer_email,
        p_delivery_district, p_delivery_area, p_delivery_full_address, p_delivery_instructions,
        0.00, p_delivery_charge, p_discount, p_coupon_code, 0.00, p_customer_notes, 'Pending'
    ) RETURNING id INTO v_order_id;

    -- 2. Process each item with strict stock locking
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INT;
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
        END IF;

        -- Lock variant row for stock check
        SELECT * INTO v_variant FROM product_variants
        WHERE id = (v_item->>'variantId') FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant % not found', v_item->>'variantId';
        END IF;

        IF v_variant.stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for % (Available: %, Requested: %)',
                v_variant.sku, v_variant.stock, v_qty;
        END IF;

        -- Retrieve parent product
        SELECT * INTO v_product FROM products WHERE id = v_variant.product_id;

        -- Determine customization price if applicable
        v_custom_price := 0.00;
        IF (v_item->>'customName') IS NOT NULL AND TRIM(v_item->>'customName') <> '' THEN
            IF v_product.jersey_allow_customization THEN
                v_custom_price := v_product.jersey_customization_price;
            END IF;
        END IF;

        v_unit_price := v_product.base_price + v_variant.price_modifier + v_custom_price;
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;
        v_customization_total := v_customization_total + (v_custom_price * v_qty);

        -- Insert order item snapshot
        INSERT INTO order_items (
            order_id, product_id, variant_id, product_name, product_image,
            size, color, variant_sku, custom_name, custom_number,
            customization_price, unit_price, quantity, total_price
        ) VALUES (
            v_order_id, v_product.id, v_variant.id, v_product.name,
            COALESCE((SELECT url FROM product_images WHERE product_id = v_product.id AND is_primary LIMIT 1), ''),
            v_variant.size, v_variant.color_name, v_variant.sku,
            v_item->>'customName', v_item->>'customNumber',
            v_custom_price, v_unit_price, v_qty, v_line_total
        );

        -- Decrement stock atomically
        UPDATE product_variants
        SET stock = stock - v_qty
        WHERE id = v_variant.id;

        -- Record inventory audit movement
        INSERT INTO inventory_movements (
            variant_id, order_id, quantity_change, movement_type, reference_note
        ) VALUES (
            v_variant.id, v_order_id, -v_qty, 'order_placed',
            'Order ' || p_order_number || ' placed via Cash on Delivery'
        );
    END LOOP;

    -- 3. Calculate final grand total
    v_grand_total := GREATEST(0.00, v_subtotal + p_delivery_charge - p_discount);

    UPDATE orders
    SET subtotal = v_subtotal, grand_total = v_grand_total
    WHERE id = v_order_id;

    -- 4. Initial status timeline step
    INSERT INTO order_status_history (
        order_id, previous_status, new_status, comment
    ) VALUES (
        v_order_id, NULL, 'Pending', 'Order placed via Cash on Delivery queue.'
    );

    -- 5. Generate matching Invoice snapshot
    v_inv_num := REPLACE(p_order_number, 'EN-', 'EN-INV-');
    INSERT INTO invoices (
        invoice_number, order_id, issue_date, subtotal, customization_total,
        delivery_charge, discount, grand_total
    ) VALUES (
        v_inv_num, v_order_id, CURRENT_DATE, v_subtotal, v_customization_total,
        p_delivery_charge, p_discount, v_grand_total
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'order_number', p_order_number,
        'invoice_number', v_inv_num,
        'grand_total', v_grand_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to restore stock when order is Cancelled or Returned
CREATE OR REPLACE FUNCTION restore_stock_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    IF (NEW.status IN ('Cancelled', 'Returned')) AND (OLD.status NOT IN ('Cancelled', 'Returned')) THEN
        FOR v_item IN SELECT * FROM order_items WHERE order_id = NEW.id
        LOOP
            UPDATE product_variants
            SET stock = stock + v_item.quantity
            WHERE id = v_item.variant_id;

            INSERT INTO inventory_movements (
                variant_id, order_id, quantity_change, movement_type, reference_note
            ) VALUES (
                v_item.variant_id, NEW.id, v_item.quantity,
                CASE WHEN NEW.status = 'Cancelled' THEN 'order_cancelled' ELSE 'return_restock' END,
                'Stock restored due to order ' || NEW.order_number || ' status ' || NEW.status
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON orders;
CREATE TRIGGER trg_restore_stock_on_cancel
AFTER UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancellation();

-- Secure Public Order Tracking for Guest and Registered Users
CREATE OR REPLACE FUNCTION track_guest_order(p_order_number TEXT, p_phone TEXT)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_items JSONB;
    v_timeline JSONB;
    v_courier JSONB;
    v_clean_phone TEXT;
    v_order_phone TEXT;
BEGIN
    SELECT * INTO v_order FROM orders
    WHERE UPPER(order_number) = UPPER(TRIM(p_order_number));

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No order found with this reference number.');
    END IF;

    -- Verify phone if supplied
    IF p_phone IS NOT NULL AND TRIM(p_phone) <> '' THEN
        v_clean_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
        v_order_phone := REGEXP_REPLACE(v_order.customer_phone, '[^0-9]', '', 'g');
        IF NOT (v_order_phone LIKE '%' || v_clean_phone OR v_clean_phone LIKE '%' || v_order_phone) THEN
            RETURN jsonb_build_object('success', FALSE, 'error', 'Phone number does not match this order.');
        END IF;
    END IF;

    -- Collect items
    SELECT jsonb_agg(to_jsonb(i)) INTO v_items FROM order_items i WHERE i.order_id = v_order.id;
    -- Collect timeline
    SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at ASC) INTO v_timeline FROM order_status_history h WHERE h.order_id = v_order.id;
    -- Collect courier details if dispatched
    SELECT to_jsonb(c) INTO v_courier FROM courier_shipments c WHERE c.order_id = v_order.id LIMIT 1;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order', to_jsonb(v_order),
        'items', COALESCE(v_items, '[]'::jsonb),
        'timeline', COALESCE(v_timeline, '[]'::jsonb),
        'courier', v_courier
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Profiles owner select" ON profiles;
CREATE POLICY "Profiles owner select" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Profiles owner update" ON profiles;
CREATE POLICY "Profiles owner update" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin(auth.uid()));

-- 2. User Roles & Activity
DROP POLICY IF EXISTS "Users view own role" ON user_roles;
CREATE POLICY "Users view own role" ON user_roles FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Super Admins manage roles" ON user_roles;
CREATE POLICY "Super Admins manage roles" ON user_roles FOR ALL USING (is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view activity logs" ON admin_activity_logs;
CREATE POLICY "Admins view activity logs" ON admin_activity_logs FOR SELECT USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins insert activity logs" ON admin_activity_logs;
CREATE POLICY "Admins insert activity logs" ON admin_activity_logs FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 3. Categories, Products, Images, Variants
DROP POLICY IF EXISTS "Public view active categories" ON categories;
CREATE POLICY "Public view active categories" ON categories FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage categories" ON categories;
CREATE POLICY "Admins manage categories" ON categories FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view active products" ON products;
CREATE POLICY "Public view active products" ON products FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage products" ON products;
CREATE POLICY "Admins manage products" ON products FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view product images" ON product_images;
CREATE POLICY "Public view product images" ON product_images FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage product images" ON product_images;
CREATE POLICY "Admins manage product images" ON product_images FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view product variants" ON product_variants;
CREATE POLICY "Public view product variants" ON product_variants FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage product variants" ON product_variants;
CREATE POLICY "Admins manage product variants" ON product_variants FOR ALL USING (is_admin(auth.uid()));

-- 4. Customer Addresses
DROP POLICY IF EXISTS "Customers manage own addresses" ON addresses;
CREATE POLICY "Customers manage own addresses" ON addresses FOR ALL USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 5. Orders & Order Items
DROP POLICY IF EXISTS "Users view own orders" ON orders;
CREATE POLICY "Users view own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Users view own order items" ON order_items;
CREATE POLICY "Users view own order items" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "Admins manage orders" ON orders;
CREATE POLICY "Admins manage orders" ON orders FOR ALL USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage order items" ON order_items;
CREATE POLICY "Admins manage order items" ON order_items FOR ALL USING (is_admin(auth.uid()));

-- 6. Courier Management (Server/Admin only)
DROP POLICY IF EXISTS "Public view active courier names" ON courier_providers;
CREATE POLICY "Public view active courier names" ON courier_providers FOR SELECT USING (is_active = TRUE);
DROP POLICY IF EXISTS "Admins manage couriers" ON courier_providers;
CREATE POLICY "Admins manage couriers" ON courier_providers FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users view shipment for their order" ON courier_shipments;
CREATE POLICY "Users view shipment for their order" ON courier_shipments FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = courier_shipments.order_id AND (orders.user_id = auth.uid() OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "Admins manage courier shipments" ON courier_shipments;
CREATE POLICY "Admins manage courier shipments" ON courier_shipments FOR ALL USING (is_admin(auth.uid()));

-- 7. Invoices
DROP POLICY IF EXISTS "Users view invoice for their order" ON invoices;
CREATE POLICY "Users view invoice for their order" ON invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND (orders.user_id = auth.uid() OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "Admins manage invoices" ON invoices;
CREATE POLICY "Admins manage invoices" ON invoices FOR ALL USING (is_admin(auth.uid()));

-- 8. Website Settings, Theme, Banners, Sections & Navigation
DROP POLICY IF EXISTS "Public read site settings" ON site_settings;
CREATE POLICY "Public read site settings" ON site_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Admins manage site settings" ON site_settings;
CREATE POLICY "Admins manage site settings" ON site_settings FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public read active theme" ON website_theme;
CREATE POLICY "Public read active theme" ON website_theme FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage website theme" ON website_theme;
CREATE POLICY "Admins manage website theme" ON website_theme FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view active banners" ON banners;
CREATE POLICY "Public view active banners" ON banners FOR SELECT USING (
    (is_active = TRUE AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW()))
    OR is_admin(auth.uid())
);
DROP POLICY IF EXISTS "Admins manage banners" ON banners;
CREATE POLICY "Admins manage banners" ON banners FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view visible homepage sections" ON homepage_sections;
CREATE POLICY "Public view visible homepage sections" ON homepage_sections FOR SELECT USING (is_visible = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage homepage sections" ON homepage_sections;
CREATE POLICY "Admins manage homepage sections" ON homepage_sections FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view active navigation" ON navigation_items;
CREATE POLICY "Public view active navigation" ON navigation_items FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage navigation" ON navigation_items;
CREATE POLICY "Admins manage navigation" ON navigation_items FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Public view active coupons" ON coupons;
CREATE POLICY "Public view active coupons" ON coupons FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins manage coupons" ON coupons;
CREATE POLICY "Admins manage coupons" ON coupons FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins view inventory movements" ON inventory_movements;
CREATE POLICY "Admins view inventory movements" ON inventory_movements FOR SELECT USING (is_admin(auth.uid()));

-- ---------------------------------------------------------------------
-- 12. INITIAL SEED DATA
-- ---------------------------------------------------------------------

-- 1. Exact Category Hierarchy
INSERT INTO categories (id, name, slug, parent_id, level, description, image_url, sort_order, is_active)
VALUES
-- Level 1: Root Categories
('clothing', 'Clothing', 'clothing', NULL, 1, 'Heavyweight streetwear and everyday essentials.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('jerseys', 'Jerseys', 'jerseys', NULL, 1, 'Authentic football matchday kits and retro legends.', 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80', 2, TRUE),

-- Level 2: Subcategories under Jerseys
('national-teams', 'National Teams', 'national-teams', 'jerseys', 2, 'Represent your country on the world stage.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('club-teams', 'Club Teams', 'club-teams', 'jerseys', 2, 'Official European club jerseys and championship kits.', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80', 2, TRUE),

-- Level 3: National Teams
('argentina', 'Argentina', 'argentina', 'national-teams', 3, 'Albiceleste 3-Star World Champions Kits.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('brazil', 'Brazil', 'brazil', 'national-teams', 3, 'Canarinho 5-Star Samba Football Heritage.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('france', 'France', 'france', 'national-teams', 3, 'Les Bleus official match editions.', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),

-- Level 3: Club Teams
('real-madrid', 'Real Madrid', 'real-madrid', 'club-teams', 3, 'Los Blancos official La Liga and Champions League kits.', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('barcelona', 'Barcelona', 'barcelona', 'club-teams', 3, 'FC Barcelona Blaugrana heritage.', 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('manchester-united', 'Manchester United', 'manchester-united', 'club-teams', 3, 'The Red Devils Old Trafford editions.', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),

-- Level 2: Subcategories under Clothing
('oversized-tees', 'Oversized T-Shirts', 'oversized-tees', 'clothing', 2, '260+ GSM compact combed boxy tees.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('hoodies', 'Hoodies', 'hoodies', 'clothing', 2, '400 GSM French Terry loopback cotton hoodies.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('sweatshirts', 'Sweatshirts', 'sweatshirts', 'clothing', 2, 'Brushed fleece crewnecks and acid wash patinas.', 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),
('polo-shirts', 'Polo Shirts', 'polo-shirts', 'clothing', 2, '240 GSM organic piqué cotton polos.', 'https://images.unsplash.com/photo-1625910513413-5a2119df43fa?auto=format&fit=crop&w=1000&q=80', 4, TRUE),
('shirts', 'Casual Shirts', 'shirts', 'clothing', 2, 'Poplin utility overshirts and layering essentials.', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    sort_order = EXCLUDED.sort_order;

-- 2. Courier Providers Seed
INSERT INTO courier_providers (id, name, code, is_active, is_default, tracking_url_template, api_endpoint_base)
VALUES
('steadfast', 'Steadfast Courier', 'STEADFAST', TRUE, TRUE, 'https://steadfast.com.bd/t/{consignment_id}', 'https://portal.steadfast.com.bd/api/v1'),
('pathao', 'Pathao Courier', 'PATHAO', TRUE, FALSE, 'https://pathao.com/courier/tracking/?consignment_id={consignment_id}', 'https://api-hermes.pathao.com/aladdin/api/v1'),
('redx', 'RedX Logistics', 'REDX', TRUE, FALSE, 'https://redx.com.bd/track-order/?trackingId={consignment_id}', 'https://openapi.redx.com.bd/v1.0.0-beta')
ON CONFLICT (id) DO NOTHING;

-- 3. Visual Theme Configuration Seed
INSERT INTO website_theme (
    id, logo_text, color_brand_bg, color_brand_text, color_brand_olive,
    color_brand_card, color_brand_border, color_brand_muted, font_display, font_body,
    announcement_text, announcement_is_active, is_active
)
VALUES (
    'default', 'ELEVEN NATION', '#F5F3EE', '#171717', '#8A927A',
    '#FFFFFF', '#D8D4CA', '#77746D', 'Manrope', 'DM Sans',
    'Free express delivery on orders over ৳2,500 across Bangladesh · Cash on Delivery available',
    TRUE, TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 4. Site Settings Seed
INSERT INTO site_settings (key, value, description)
VALUES
('store_info', '{
    "store_name": "ELEVEN NATION",
    "tagline": "WEAR YOUR IDENTITY.",
    "official_domain": "elevennation.shop",
    "support_email": "support@elevennation.shop",
    "support_phone": "+880 1712-345678",
    "whatsapp": "+880 1712-345678",
    "studio_address": "House 12, Road 4, Banani, Dhaka-1213, Bangladesh"
}'::jsonb, 'Core brand and studio contact info'),
('shipping_fees', '{
    "free_shipping_threshold": 2500,
    "dhaka_delivery_fee": 70,
    "outside_dhaka_delivery_fee": 130,
    "currency": "BDT",
    "currency_symbol": "৳"
}'::jsonb, 'Bangladesh delivery rates')
ON CONFLICT (key) DO NOTHING;

-- 5. Homepage Sections Seed
INSERT INTO homepage_sections (section_key, title, subtitle, sort_order, is_visible)
VALUES
('hero_slider', 'Hero Campaign Slider', 'Editorial campaign photography', 1, TRUE),
('trust_strip', 'Value Proposition Strip', 'Cash on Delivery & 7-Day Exchange', 2, TRUE),
('categories_grid', 'Shop By Category', 'Tailored essentials and pitch passion', 3, TRUE),
('new_arrivals', 'New Arrivals', 'Latest seasonal drops', 4, TRUE),
('casual_campaign', 'Featured Casual Drop', 'Heavyweight 260+ GSM series', 5, TRUE),
('football_campaign', 'Football Culture', 'Match kits & player customization', 6, TRUE),
('best_sellers', 'Best Sellers', 'Top trending community picks', 7, TRUE),
('brand_manifesto', 'The Manifesto', 'This is Eleven Nation', 8, TRUE)
ON CONFLICT (section_key) DO NOTHING;

-- 6. Navigation Items Seed
INSERT INTO navigation_items (label, path, menu_location, sort_order, is_active)
VALUES
('Home', '/', 'header', 1, TRUE),
('Shop', '/shop', 'header', 2, TRUE),
('Casual Wear', '/casual-clothing', 'header', 3, TRUE),
('Football Jerseys', '/football-jerseys', 'header', 4, TRUE),
('About Us', '/about', 'header', 5, TRUE)
ON CONFLICT DO NOTHING;
