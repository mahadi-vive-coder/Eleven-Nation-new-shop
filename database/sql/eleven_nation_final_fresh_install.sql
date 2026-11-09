-- =====================================================================
-- ELEVEN NATION (elevennation.shop) — DEFINITIVE FRESH PRODUCTION RELEASE
-- Authoritative Single-File Master Schema & Database Architecture
-- Target Platform: Supabase PostgreSQL 15+ / Supabase Auth / Storage
-- Currency: BDT (৳) | Payment Method: Cash on Delivery (COD) Strictly
-- Courier Provider: Steadfast Courier (Admin-Controlled Dispatch & Webhooks)
-- Notice: Fresh Installation Only — No Legacy Migrations Required
-- =====================================================================

-- ---------------------------------------------------------------------
-- SECTION 1: EXTENSIONS & SCHEMAS
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

SET search_path = public, extensions;

-- ---------------------------------------------------------------------
-- SECTION 2: CORE IDENTITY & USER ROLES
-- ---------------------------------------------------------------------

-- Profiles: Customer & Administrator profile metadata linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Roles: Explicit Resource-Based Role Matrix
-- Allowed roles: super_admin, order_manager, product_manager, content_manager, customer
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'order_manager', 'product_manager', 'content_manager', 'customer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Admin Activity Logs: Strictly Append-Only Audit Trail
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);

-- System Secrets: Server-Side Secret Key-Value Storage (HMAC Peppers, API Keys)
CREATE TABLE IF NOT EXISTS public.system_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secret_key TEXT UNIQUE NOT NULL,
    secret_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- SECTION 3: CATALOG & INVENTORY TABLES
-- ---------------------------------------------------------------------

-- Product Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active_order ON public.categories(is_active, sort_order ASC);

-- Base Products
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    subtitle TEXT,
    description TEXT,
    product_type TEXT NOT NULL DEFAULT 'casual' CHECK (product_type IN ('casual', 'jersey', 'accessory')),
    base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
    compare_at_price NUMERIC(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= base_price),
    is_customizable BOOLEAN NOT NULL DEFAULT FALSE,
    customization_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (customization_charge >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- Product Images
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    alt_text TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id, sort_order ASC);

-- Product Variants: Independent Size and Color SKU with Strict Inventory
-- Sizes: S, M, L, XL, XXL (or alphanumeric)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    sku TEXT UNIQUE,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    price_modifier NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color)
);

CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON public.product_variants(sku);

-- Public Product Variants View: Conceals Raw Warehouse Quantities
CREATE OR REPLACE VIEW public.public_product_variants AS
SELECT 
    pv.id,
    pv.product_id,
    pv.size,
    pv.color,
    pv.sku,
    pv.price_modifier,
    pv.is_active,
    (pv.stock > 0) AS in_stock,
    pv.created_at,
    pv.updated_at
FROM public.product_variants pv
WHERE pv.is_active = TRUE;

-- Inventory Movements: Strictly Append-Only Stock Audit
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('order_reserve', 'order_cancel_restock', 'admin_adjustment', 'initial_seed')),
    quantity INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id TEXT,
    reason TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_variant ON public.inventory_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_ref ON public.inventory_movements(reference_id);

-- ---------------------------------------------------------------------
-- SECTION 4: STORE SETTINGS, THEME & MARKETING
-- ---------------------------------------------------------------------

-- Store Settings
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name TEXT NOT NULL DEFAULT 'Eleven Nation',
    tagline TEXT NOT NULL DEFAULT 'Wear Your Identity.',
    official_domain TEXT NOT NULL DEFAULT 'elevennation.shop',
    support_email TEXT NOT NULL DEFAULT 'elevennation.support@gmail.com',
    support_phone TEXT NOT NULL DEFAULT '+880 1700-000000',
    whatsapp_number TEXT DEFAULT '+880 1700-000000',
    studio_address TEXT DEFAULT 'House 11, Road 7, Sector 3, Uttara, Dhaka 1230, Bangladesh',
    currency TEXT NOT NULL DEFAULT 'BDT',
    currency_symbol TEXT NOT NULL DEFAULT '৳',
    free_shipping_threshold NUMERIC(12,2) NOT NULL DEFAULT 2500.00 CHECK (free_shipping_threshold >= 0),
    dhaka_delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 80.00 CHECK (dhaka_delivery_fee >= 0),
    outside_dhaka_delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 130.00 CHECK (outside_dhaka_delivery_fee >= 0),
    is_maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Theme Customizations
CREATE TABLE IF NOT EXISTS public.theme_customizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hero_title TEXT DEFAULT 'Modern Streetwear & Matchday Classics',
    hero_subtitle TEXT DEFAULT 'Engineered for the pitch and the streets of Bangladesh.',
    announcement_text TEXT DEFAULT 'Cash on Delivery Across All 64 Districts in Bangladesh. Free Shipping on Orders Over ৳2,500.',
    announcement_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Banners
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    desktop_image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    button_text TEXT,
    button_link TEXT,
    image_alt_text TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_at TIMESTAMPTZ,
    end_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_active ON public.banners(is_active, sort_order ASC);

-- Homepage Sections
CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_key TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_order_amount >= 0),
    max_discount_amount NUMERIC(12,2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
    used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

-- ---------------------------------------------------------------------
-- SECTION 5: CUSTOMER ADDRESSES & COMMERCE ORDERS
-- ---------------------------------------------------------------------

-- Customer Shipping Addresses
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    district TEXT NOT NULL,
    area TEXT NOT NULL,
    full_address TEXT NOT NULL,
    delivery_instructions TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_customer ON public.customer_addresses(customer_id);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address TEXT NOT NULL,
    delivery_zone TEXT NOT NULL CHECK (delivery_zone IN ('inside_dhaka', 'outside_dhaka')),
    customer_note TEXT,
    
    -- Immutable Financial Calculation Fields
    subtotal NUMERIC(12,2) NOT NULL CHECK (subtotal >= 0),
    delivery_charge NUMERIC(12,2) NOT NULL CHECK (delivery_charge >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
    coupon_code TEXT,
    payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery' CHECK (payment_method = 'Cash on Delivery'),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    
    -- State Machine & Restock Protection
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    stock_restored BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Secure Cryptographic Guest Access Token
    guest_access_token TEXT NOT NULL,
    
    -- Steadfast Courier Dispatch Attributes
    courier_code TEXT DEFAULT 'steadfast',
    tracking_number TEXT,
    consignment_id TEXT,
    courier_notes TEXT,
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON public.orders(guest_access_token);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_consignment ON public.orders(consignment_id);

-- Order Items: Immutable Line-Item Snapshot
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_sku TEXT,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    custom_name TEXT,
    custom_number TEXT,
    customization_charge NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (customization_charge >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- Order Status History: Strictly Append-Only Audit Trail
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    notes TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);

-- Checkout Idempotency Keys: Concurrency-Safe Retry & Replay Cache
CREATE TABLE IF NOT EXISTS public.checkout_idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    payload_hash TEXT NOT NULL,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    response_payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_key ON public.checkout_idempotency_keys(key);
CREATE INDEX IF NOT EXISTS idx_checkout_idempotency_expires ON public.checkout_idempotency_keys(expires_at);

-- Invoices: Authoritative Financial Invoice Snapshots & Storage Pointers
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    pdf_url TEXT,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);

-- Invoice Generation Queue: Asynchronous & Retryable Background PDF Queue
CREATE TABLE IF NOT EXISTS public.invoice_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID UNIQUE NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_queue_status ON public.invoice_generation_queue (status, lease_expires_at);

-- ---------------------------------------------------------------------
-- SECTION 6: STEADFAST COURIER ARCHITECTURE & DISPATCH
-- ---------------------------------------------------------------------

-- Couriers Registry
CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (code IN ('steadfast', 'manual')),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Courier Shipments: Dispatched Consignment Records
CREATE TABLE IF NOT EXISTS public.courier_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT UNIQUE,
    courier_code TEXT NOT NULL DEFAULT 'steadfast',
    consignment_id TEXT NOT NULL,
    tracking_code TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_review',
    cod_amount NUMERIC(12, 2) NOT NULL CHECK (cod_amount >= 0),
    dispatch_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_consignment ON public.courier_shipments (consignment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.courier_shipments (tracking_code);

-- Courier Dispatch Claims: Database-Backed Concurrency Lock & Lease
CREATE TABLE IF NOT EXISTS public.courier_dispatch_claims (
    order_id UUID PRIMARY KEY REFERENCES public.orders(id) ON DELETE CASCADE,
    courier_code TEXT NOT NULL DEFAULT 'steadfast',
    claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    claim_token TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('claimed', 'dispatched', 'failed')),
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    lease_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '5 minutes'),
    last_error TEXT,
    retry_count INT NOT NULL DEFAULT 0
);

-- Courier Webhook Events: Strictly Idempotent Event Log
CREATE TABLE IF NOT EXISTS public.courier_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    courier_code TEXT NOT NULL DEFAULT 'steadfast',
    event_id TEXT NOT NULL UNIQUE,
    consignment_id TEXT,
    invoice_number TEXT,
    status TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processing_status TEXT NOT NULL CHECK (processing_status IN ('processing', 'processed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON public.courier_webhook_events (event_id);

-- System Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, is_read);

-- Guest Tracking Rate Limits: Atomic IP Brute-Force Shield
CREATE TABLE IF NOT EXISTS public.guest_tracking_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hash TEXT NOT NULL,
    attempt_count INT NOT NULL DEFAULT 1,
    window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_tracking_ip_window ON public.guest_tracking_rate_limits(ip_hash, window_start);

-- ---------------------------------------------------------------------
-- SECTION 7: RBAC & TRIGGER HELPER FUNCTIONS
-- ---------------------------------------------------------------------

-- Auto-update updated_at timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Check if current authenticated user has super_admin role
CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
          AND role = 'super_admin'
    );
$$;

-- Check if current authenticated user has any administrative staff role
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
          AND role IN ('super_admin', 'order_manager', 'product_manager', 'content_manager')
    );
$$;

-- Check if current authenticated user has an explicit role
CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = auth.uid() 
          AND role = p_role
    );
$$;

-- Strictly Append-Only Enforcement Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Table % is strictly append-only. Deletion is forbidden.', TG_TABLE_NAME
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'admin_activity_logs' THEN
            IF OLD.admin_id IS NOT NULL AND NEW.admin_id IS NULL
               AND NEW.action = OLD.action
               AND NEW.entity_type = OLD.entity_type
               AND NEW.created_at = OLD.created_at THEN
                RETURN NEW;
            END IF;
        ELSIF TG_TABLE_NAME = 'inventory_movements' THEN
            IF (OLD.variant_id IS NOT NULL AND NEW.variant_id IS NULL)
               OR (OLD.changed_by IS NOT NULL AND NEW.changed_by IS NULL) THEN
                IF NEW.quantity = OLD.quantity 
                   AND NEW.movement_type = OLD.movement_type
                   AND NEW.created_at = OLD.created_at THEN
                    RETURN NEW;
                END IF;
            END IF;
        ELSIF TG_TABLE_NAME = 'order_status_history' THEN
            IF OLD.changed_by IS NOT NULL AND NEW.changed_by IS NULL
               AND NEW.to_status = OLD.to_status
               AND NEW.order_id = OLD.order_id
               AND NEW.created_at = OLD.created_at THEN
                RETURN NEW;
            END IF;
        END IF;

        RAISE EXCEPTION 'Table % is strictly append-only. Modification is forbidden.', TG_TABLE_NAME
            USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
END;
$$;

-- Attach append-only triggers
DROP TRIGGER IF EXISTS trg_append_only_admin_logs ON public.admin_activity_logs;
CREATE TRIGGER trg_append_only_admin_logs
BEFORE UPDATE OR DELETE ON public.admin_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

DROP TRIGGER IF EXISTS trg_append_only_inventory_movements ON public.inventory_movements;
CREATE TRIGGER trg_append_only_inventory_movements
BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

DROP TRIGGER IF EXISTS trg_append_only_order_status_history ON public.order_status_history;
CREATE TRIGGER trg_append_only_order_status_history
BEFORE UPDATE OR DELETE ON public.order_status_history
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

-- Immutable Line Items Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_order_items_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Order line items are strictly immutable once placed.'
            USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_order_items_immutable ON public.order_items;
CREATE TRIGGER trg_order_items_immutable
BEFORE UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_order_items_immutable();

-- ---------------------------------------------------------------------
-- SECTION 8: ORDER STATE MACHINE & RESTOCK AUTOMATION
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_item RECORD;
    v_current_stock INT;
BEGIN
    -- 1. Protect Financial and Critical Metadata Fields from Tampering
    IF OLD.subtotal IS DISTINCT FROM NEW.subtotal
       OR OLD.delivery_charge IS DISTINCT FROM NEW.delivery_charge
       OR OLD.discount_amount IS DISTINCT FROM NEW.discount_amount
       OR OLD.total IS DISTINCT FROM NEW.total
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
       OR OLD.order_number IS DISTINCT FROM NEW.order_number
       OR OLD.coupon_code IS DISTINCT FROM NEW.coupon_code
       OR OLD.guest_access_token IS DISTINCT FROM NEW.guest_access_token THEN
        RAISE EXCEPTION 'Financial fields, order number, and guest access token are strictly immutable.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Protect Customer Ownership Reassignment
    IF OLD.customer_id IS NOT NULL AND NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
        RAISE EXCEPTION 'Order customer ownership cannot be reassigned.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 3. Protect Single-Restoration Flag Reversion
    IF OLD.stock_restored = TRUE AND NEW.stock_restored = FALSE THEN
        RAISE EXCEPTION 'stock_restored flag cannot be reverted to false.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 4. Enforce Order Status State Machine
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Allowed Transitions:
        -- pending -> confirmed, cancelled
        -- confirmed -> processing, shipped, cancelled
        -- processing -> shipped, cancelled
        -- shipped -> delivered, returned
        -- delivered -> [terminal]
        -- cancelled -> [terminal]
        -- returned  -> [terminal]
        IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid status transition: pending can only transition to confirmed or cancelled.'
                USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'confirmed' AND NEW.status NOT IN ('processing', 'shipped', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid status transition: confirmed can only transition to processing, shipped, or cancelled.'
                USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('shipped', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid status transition: processing can only transition to shipped or cancelled.'
                USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'returned') THEN
            RAISE EXCEPTION 'Invalid status transition: shipped can only transition to delivered or returned.'
                USING ERRCODE = 'P0001';
        ELSIF OLD.status IN ('delivered', 'cancelled', 'returned') THEN
            RAISE EXCEPTION 'Terminal order status (%) cannot be changed.', OLD.status
                USING ERRCODE = 'P0001';
        END IF;

        -- Record timestamps
        IF NEW.status = 'shipped' AND NEW.shipped_at IS NULL THEN
            NEW.shipped_at := NOW();
        ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
            NEW.delivered_at := NOW();
        ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
            NEW.cancelled_at := NOW();
        END IF;

        -- Automatic Single-Restoration on Cancellation or Return
        IF NEW.status IN ('cancelled', 'returned') AND OLD.stock_restored = FALSE THEN
            FOR v_item IN (SELECT variant_id, quantity FROM public.order_items WHERE order_id = OLD.id) LOOP
                IF v_item.variant_id IS NOT NULL THEN
                    SELECT stock INTO v_current_stock 
                    FROM public.product_variants 
                    WHERE id = v_item.variant_id 
                    FOR UPDATE;

                    IF FOUND THEN
                        UPDATE public.product_variants
                        SET stock = stock + v_item.quantity,
                            updated_at = NOW()
                        WHERE id = v_item.variant_id;

                        INSERT INTO public.inventory_movements (
                            variant_id,
                            movement_type,
                            quantity,
                            previous_stock,
                            new_stock,
                            reference_id,
                            reason,
                            changed_by
                        ) VALUES (
                            v_item.variant_id,
                            'order_cancel_restock',
                            v_item.quantity,
                            v_current_stock,
                            v_current_stock + v_item.quantity,
                            OLD.order_number,
                            'Order ' || OLD.order_number || ' transitioned to ' || NEW.status,
                            auth.uid()
                        );
                    END IF;
                END IF;
            END LOOP;

            NEW.stock_restored := TRUE;
        END IF;

        -- Record in Order Status History
        INSERT INTO public.order_status_history (
            order_id,
            from_status,
            to_status,
            notes,
            changed_by
        ) VALUES (
            OLD.id,
            OLD.status,
            NEW.status,
            COALESCE(NEW.courier_notes, 'Status transitioned from ' || OLD.status || ' to ' || NEW.status),
            auth.uid()
        );
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_update ON public.orders;
CREATE TRIGGER trg_validate_order_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_update();

-- ---------------------------------------------------------------------
-- SECTION 9: ATOMIC CHECKOUT & GUEST ACCESS TOKEN GENERATION
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.place_order_atomic(
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_shipping_address TEXT,
    p_delivery_zone TEXT,
    p_customer_note TEXT,
    p_coupon_code TEXT,
    p_items JSONB,
    p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_name TEXT;
    v_clean_phone TEXT;
    v_clean_zone TEXT;
    v_clean_coupon TEXT;
    v_caller_uid UUID;
    v_payload_hash TEXT;
    v_existing_key RECORD;
    v_order_number TEXT;
    v_order_id UUID;
    v_guest_token TEXT;
    
    v_subtotal NUMERIC(12,2) := 0.00;
    v_customization_total NUMERIC(12,2) := 0.00;
    v_discount NUMERIC(12,2) := 0.00;
    v_delivery_fee NUMERIC(12,2) := 0.00;
    v_grand_total NUMERIC(12,2) := 0.00;

    v_settings RECORD;
    v_coupon RECORD;
    v_item JSONB;
    v_variant_id UUID;
    v_qty INT;
    v_custom_name TEXT;
    v_custom_number TEXT;
    
    v_product_name TEXT;
    v_sku TEXT;
    v_size TEXT;
    v_color TEXT;
    v_base_price NUMERIC(12,2);
    v_price_modifier NUMERIC(12,2);
    v_is_customizable BOOLEAN;
    v_custom_charge NUMERIC(12,2);
    v_unit_price NUMERIC(12,2);
    v_line_total NUMERIC(12,2);
    v_current_stock INT;
    v_product_id UUID;
    v_result JSONB;
BEGIN
    -- 1. Input Sanitization & Validation
    v_clean_name := TRIM(COALESCE(p_customer_name, ''));
    v_clean_phone := REGEXP_REPLACE(TRIM(COALESCE(p_customer_phone, '')), '[^0-9+]', '', 'g');
    v_clean_zone := TRIM(COALESCE(p_delivery_zone, ''));
    v_clean_coupon := NULLIF(UPPER(TRIM(COALESCE(p_coupon_code, ''))), '');
    v_caller_uid := auth.uid();

    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Customer full name must be at least 2 characters.'
            USING ERRCODE = 'P0001';
    END IF;

    IF LENGTH(v_clean_phone) < 11 THEN
        RAISE EXCEPTION 'A valid Bangladeshi contact number is required.'
            USING ERRCODE = 'P0001';
    END IF;

    IF v_clean_zone NOT IN ('inside_dhaka', 'outside_dhaka') THEN
        RAISE EXCEPTION 'Delivery zone must be either inside_dhaka or outside_dhaka.'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Order must contain at least one item.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Idempotency Key Validation & Safe Replay
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        v_payload_hash := encode(digest(
            CONCAT_WS('|', 
                v_clean_phone, 
                TRIM(p_shipping_address), 
                v_clean_zone, 
                COALESCE(v_clean_coupon, ''), 
                p_items::TEXT
            ), 
            'sha256'
        ), 'hex');

        SELECT * INTO v_existing_key
        FROM public.checkout_idempotency_keys
        WHERE key = TRIM(p_idempotency_key)
        FOR UPDATE;

        IF FOUND THEN
            IF v_existing_key.expires_at > NOW() THEN
                IF v_existing_key.payload_hash = v_payload_hash THEN
                    RETURN v_existing_key.response_payload || jsonb_build_object('idempotent_replay', TRUE);
                ELSE
                    RAISE EXCEPTION 'Idempotency key % already used with a different payload.', p_idempotency_key
                        USING ERRCODE = 'P0002';
                END IF;
            ELSE
                DELETE FROM public.checkout_idempotency_keys WHERE key = TRIM(p_idempotency_key);
            END IF;
        END IF;
    END IF;

    -- 3. Fetch Store Delivery Settings
    SELECT * INTO v_settings FROM public.store_settings LIMIT 1;
    IF NOT FOUND THEN
        v_delivery_fee := CASE WHEN v_clean_zone = 'inside_dhaka' THEN 80.00 ELSE 130.00 END;
    ELSE
        v_delivery_fee := CASE WHEN v_clean_zone = 'inside_dhaka' 
                               THEN v_settings.dhaka_delivery_fee 
                               ELSE v_settings.outside_dhaka_delivery_fee END;
    END IF;

    -- 4. Process Line Items with Deadlock-Free Row-Level Locking (FOR UPDATE)
    FOR v_item IN (
        SELECT value 
        FROM jsonb_array_elements(p_items) 
        ORDER BY (value->>'variant_id') ASC
    ) LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_qty := COALESCE((v_item->>'quantity')::INT, 1);
        v_custom_name := NULLIF(TRIM(COALESCE(v_item->>'custom_name', '')), '');
        v_custom_number := NULLIF(TRIM(COALESCE(v_item->>'custom_number', '')), '');

        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'Item quantity must be greater than zero.'
                USING ERRCODE = 'P0001';
        END IF;

        SELECT 
            pv.product_id,
            pv.sku,
            pv.size,
            pv.color,
            pv.stock,
            pv.price_modifier,
            p.name,
            p.base_price,
            p.is_customizable,
            p.customization_charge,
            p.is_active
        INTO 
            v_product_id,
            v_sku,
            v_size,
            v_color,
            v_current_stock,
            v_price_modifier,
            v_product_name,
            v_base_price,
            v_is_customizable,
            v_custom_charge,
            v_variant_id
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = v_variant_id AND pv.is_active = TRUE
        FOR UPDATE OF pv;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Selected product variant (%) is inactive or not found.', (v_item->>'variant_id')
                USING ERRCODE = 'P0001';
        END IF;

        IF v_current_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for % (% / %). Available: %, Requested: %', 
                v_product_name, v_size, v_color, v_current_stock, v_qty
                USING ERRCODE = 'P0001';
        END IF;

        v_unit_price := v_base_price + v_price_modifier;
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        IF (v_custom_name IS NOT NULL OR v_custom_number IS NOT NULL) AND v_is_customizable THEN
            v_customization_total := v_customization_total + (v_custom_charge * v_qty);
        END IF;

        -- Decrement Stock Atomically
        UPDATE public.product_variants
        SET stock = stock - v_qty,
            updated_at = NOW()
        WHERE id = (v_item->>'variant_id')::UUID;
    END LOOP;

    v_subtotal := v_subtotal + v_customization_total;

    -- 5. Validate & Apply Coupon if provided
    IF v_clean_coupon IS NOT NULL THEN
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE code = v_clean_coupon AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid or inactive promotional coupon code: %', v_clean_coupon
                USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.start_date IS NOT NULL AND v_coupon.start_date > NOW() THEN
            RAISE EXCEPTION 'Coupon code % is not yet active.', v_clean_coupon
                USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.end_date IS NOT NULL AND v_coupon.end_date < NOW() THEN
            RAISE EXCEPTION 'Coupon code % has expired.', v_clean_coupon
                USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Coupon code % has reached its maximum redemption limit.', v_clean_coupon
                USING ERRCODE = 'P0001';
        END IF;

        IF v_subtotal < v_coupon.min_order_amount THEN
            RAISE EXCEPTION 'Minimum order amount for coupon % is ৳%', v_clean_coupon, v_coupon.min_order_amount
                USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.discount_type = 'percentage' THEN
            v_discount := ROUND((v_subtotal * (v_coupon.discount_value / 100.0)), 2);
            IF v_coupon.max_discount_amount IS NOT NULL AND v_discount > v_coupon.max_discount_amount THEN
                v_discount := v_coupon.max_discount_amount;
            END IF;
        ELSE
            v_discount := v_coupon.discount_value;
        END IF;

        IF v_discount > v_subtotal THEN
            v_discount := v_subtotal;
        END IF;

        UPDATE public.coupons
        SET used_count = used_count + 1,
            updated_at = NOW()
        WHERE id = v_coupon.id;
    END IF;

    -- 6. Free Shipping Rule
    IF v_settings.free_shipping_threshold IS NOT NULL AND v_subtotal >= v_settings.free_shipping_threshold THEN
        v_delivery_fee := 0.00;
    END IF;

    v_grand_total := (v_subtotal - v_discount) + v_delivery_fee;

    -- 7. Generate Unique Order Number & Cryptographic Guest Access Token
    v_order_number := 'EN-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 90000 + 10000)::TEXT, 5, '0');
    v_guest_token := encode(gen_random_bytes(24), 'hex');

    -- 8. Insert Order Record
    INSERT INTO public.orders (
        order_number,
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        shipping_address,
        delivery_zone,
        customer_note,
        subtotal,
        delivery_charge,
        discount_amount,
        total,
        coupon_code,
        payment_method,
        payment_status,
        status,
        stock_restored,
        guest_access_token,
        courier_code
    ) VALUES (
        v_order_number,
        v_caller_uid,
        v_clean_name,
        v_clean_phone,
        p_customer_email,
        p_shipping_address,
        v_clean_zone,
        p_customer_note,
        v_subtotal,
        v_delivery_fee,
        v_discount,
        v_grand_total,
        v_clean_coupon,
        'Cash on Delivery',
        'unpaid',
        'pending',
        FALSE,
        v_guest_token,
        'steadfast'
    ) RETURNING id INTO v_order_id;

    -- 9. Insert Line Items & Record Inventory Movements
    FOR v_item IN (SELECT value FROM jsonb_array_elements(p_items)) LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_qty := COALESCE((v_item->>'quantity')::INT, 1);
        v_custom_name := NULLIF(TRIM(COALESCE(v_item->>'custom_name', '')), '');
        v_custom_number := NULLIF(TRIM(COALESCE(v_item->>'custom_number', '')), '');

        SELECT 
            pv.product_id,
            pv.sku,
            pv.size,
            pv.color,
            pv.stock,
            pv.price_modifier,
            p.name,
            p.base_price,
            p.is_customizable,
            p.customization_charge
        INTO 
            v_product_id,
            v_sku,
            v_size,
            v_color,
            v_current_stock,
            v_price_modifier,
            v_product_name,
            v_base_price,
            v_is_customizable,
            v_custom_charge
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = v_variant_id;

        v_unit_price := v_base_price + v_price_modifier;
        v_line_total := v_unit_price * v_qty;

        INSERT INTO public.order_items (
            order_id,
            product_id,
            variant_id,
            product_name,
            variant_sku,
            size,
            color,
            unit_price,
            quantity,
            total_price,
            custom_name,
            custom_number,
            customization_charge
        ) VALUES (
            v_order_id,
            v_product_id,
            v_variant_id,
            v_product_name,
            v_sku,
            v_size,
            v_color,
            v_unit_price,
            v_qty,
            v_line_total,
            v_custom_name,
            v_custom_number,
            CASE WHEN (v_custom_name IS NOT NULL OR v_custom_number IS NOT NULL) AND v_is_customizable THEN v_custom_charge ELSE 0.00 END
        );

        INSERT INTO public.inventory_movements (
            variant_id,
            movement_type,
            quantity,
            previous_stock,
            new_stock,
            reference_id,
            reason,
            changed_by
        ) VALUES (
            v_variant_id,
            'order_reserve',
            v_qty,
            v_current_stock + v_qty,
            v_current_stock,
            v_order_number,
            'Reserved for order ' || v_order_number,
            v_caller_uid
        );
    END LOOP;

    -- 10. Record Initial Order Status History
    INSERT INTO public.order_status_history (
        order_id,
        from_status,
        to_status,
        notes,
        changed_by
    ) VALUES (
        v_order_id,
        NULL,
        'pending',
        'Order placed successfully via Cash on Delivery',
        v_caller_uid
    );

    -- 11. Create Authoritative Invoice Record & Queue for Background PDF Generation
    INSERT INTO public.invoices (
        order_id,
        invoice_number,
        snapshot_data
    ) VALUES (
        v_order_id,
        'EN-INV-' || SUBSTRING(v_order_number FROM 4),
        jsonb_build_object(
            'order_number', v_order_number,
            'invoice_number', 'EN-INV-' || SUBSTRING(v_order_number FROM 4),
            'customer_name', v_clean_name,
            'customer_phone', v_clean_phone,
            'shipping_address', p_shipping_address,
            'delivery_zone', v_clean_zone,
            'subtotal', v_subtotal,
            'delivery_charge', v_delivery_fee,
            'discount_amount', v_discount,
            'total', v_grand_total,
            'payment_method', 'Cash on Delivery',
            'created_at', NOW()
        )
    );

    INSERT INTO public.invoice_generation_queue (
        order_id,
        status,
        created_at,
        updated_at
    ) VALUES (
        v_order_id,
        'queued',
        NOW(),
        NOW()
    );

    -- 12. Build Final Output Payload
    v_result := jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'guest_access_token', v_guest_token,
        'subtotal', v_subtotal,
        'delivery_charge', v_delivery_fee,
        'discount_amount', v_discount,
        'total', v_grand_total,
        'idempotent_replay', FALSE
    );

    -- 13. Save Idempotency Key Cache (Valid for 24 Hours)
    IF p_idempotency_key IS NOT NULL AND TRIM(p_idempotency_key) != '' THEN
        INSERT INTO public.checkout_idempotency_keys (
            key,
            payload_hash,
            order_id,
            response_payload,
            expires_at
        ) VALUES (
            TRIM(p_idempotency_key),
            v_payload_hash,
            v_order_id,
            v_result,
            NOW() + INTERVAL '24 hours'
        );
    END IF;

    RETURN v_result;
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 10: GUEST ORDER TRACKING
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.track_guest_order(
    p_order_number TEXT,
    p_phone TEXT DEFAULT NULL,
    p_guest_access_token TEXT DEFAULT NULL,
    p_client_ip TEXT DEFAULT '127.0.0.1'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_clean_order_num TEXT;
    v_clean_phone TEXT;
    v_clean_token TEXT;
    v_ip_hash TEXT;
    v_rate_limit RECORD;
    v_order RECORD;
    v_items JSONB;
BEGIN
    v_clean_order_num := UPPER(TRIM(COALESCE(p_order_number, '')));
    v_clean_phone := REGEXP_REPLACE(TRIM(COALESCE(p_phone, '')), '[^0-9]', '', 'g');
    v_clean_token := NULLIF(TRIM(COALESCE(p_guest_access_token, '')), '');

    IF LENGTH(v_clean_order_num) < 5 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Invalid order number format.');
    END IF;

    -- Pathway A: Token-Based Instant Verification (Cryptographically Unguessable)
    IF v_clean_token IS NOT NULL THEN
        SELECT * INTO v_order
        FROM public.orders
        WHERE order_number = v_clean_order_num 
          AND guest_access_token = v_clean_token;

        IF FOUND THEN
            SELECT jsonb_agg(jsonb_build_object(
                'product_name', oi.product_name,
                'size', oi.size,
                'color', oi.color,
                'quantity', oi.quantity,
                'unit_price', oi.unit_price,
                'total_price', oi.total_price,
                'custom_name', oi.custom_name,
                'custom_number', oi.custom_number
            )) INTO v_items
            FROM public.order_items oi
            WHERE oi.order_id = v_order.id;

            RETURN jsonb_build_object(
                'success', TRUE,
                'verified_by', 'guest_access_token',
                'order', jsonb_build_object(
                    'order_number', v_order.order_number,
                    'status', v_order.status,
                    'payment_status', v_order.payment_status,
                    'customer_name', v_order.customer_name,
                    'delivery_address', v_order.shipping_address,
                    'delivery_zone', v_order.delivery_zone,
                    'subtotal', v_order.subtotal,
                    'delivery_charge', v_order.delivery_charge,
                    'discount_amount', v_order.discount_amount,
                    'total', v_order.total,
                    'courier_code', v_order.courier_code,
                    'consignment_id', v_order.consignment_id,
                    'tracking_number', v_order.tracking_number,
                    'shipped_at', v_order.shipped_at,
                    'delivered_at', v_order.delivered_at,
                    'created_at', v_order.created_at,
                    'items', COALESCE(v_items, '[]'::jsonb)
                )
            );
        ELSE
            RETURN jsonb_build_object('success', FALSE, 'message', 'Order not found or invalid guest access token.');
        END IF;
    END IF;

    -- Pathway B: Phone Number Verification with Atomic IP Rate Limiting Shield
    IF LENGTH(v_clean_phone) < 6 THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Please provide either a guest access token or phone number to verify.');
    END IF;

    v_ip_hash := encode(digest(COALESCE(p_client_ip, '127.0.0.1'), 'sha256'), 'hex');

    SELECT * INTO v_rate_limit
    FROM public.guest_tracking_rate_limits
    WHERE ip_hash = v_ip_hash AND window_start > NOW() - INTERVAL '15 minutes'
    FOR UPDATE;

    IF FOUND THEN
        IF v_rate_limit.blocked_until IS NOT NULL AND v_rate_limit.blocked_until > NOW() THEN
            RETURN jsonb_build_object(
                'success', FALSE, 
                'message', 'Too many tracking attempts. Please wait 15 minutes before trying again.'
            );
        END IF;

        IF v_rate_limit.attempt_count >= 15 THEN
            UPDATE public.guest_tracking_rate_limits
            SET blocked_until = NOW() + INTERVAL '15 minutes'
            WHERE id = v_rate_limit.id;

            RETURN jsonb_build_object(
                'success', FALSE, 
                'message', 'Too many tracking attempts. Access temporarily paused for 15 minutes.'
            );
        END IF;

        UPDATE public.guest_tracking_rate_limits
        SET attempt_count = attempt_count + 1
        WHERE id = v_rate_limit.id;
    ELSE
        INSERT INTO public.guest_tracking_rate_limits (ip_hash, attempt_count, window_start)
        VALUES (v_ip_hash, 1, NOW());
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = v_clean_order_num;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'No order found with the provided order number.');
    END IF;

    IF RIGHT(REGEXP_REPLACE(v_order.customer_phone, '[^0-9]', '', 'g'), 7) != RIGHT(v_clean_phone, 7) THEN
        RETURN jsonb_build_object('success', FALSE, 'message', 'Contact phone number does not match this order.');
    END IF;

    SELECT jsonb_agg(jsonb_build_object(
        'product_name', oi.product_name,
        'size', oi.size,
        'color', oi.color,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'total_price', oi.total_price,
        'custom_name', oi.custom_name,
        'custom_number', oi.custom_number
    )) INTO v_items
    FROM public.order_items oi
    WHERE oi.order_id = v_order.id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'verified_by', 'phone_match',
        'order', jsonb_build_object(
            'order_number', v_order.order_number,
            'status', v_order.status,
            'payment_status', v_order.payment_status,
            'customer_name', v_order.customer_name,
            'delivery_address', v_order.shipping_address,
            'delivery_zone', v_order.delivery_zone,
            'subtotal', v_order.subtotal,
            'delivery_charge', v_order.delivery_charge,
            'discount_amount', v_order.discount_amount,
            'total', v_order.total,
            'courier_code', v_order.courier_code,
            'consignment_id', v_order.consignment_id,
            'tracking_number', v_order.tracking_number,
            'shipped_at', v_order.shipped_at,
            'delivered_at', v_order.delivered_at,
            'created_at', v_order.created_at,
            'items', COALESCE(v_items, '[]'::jsonb)
        )
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 11: STEADFAST DISPATCH CLAIMS & WEBHOOK PROCESSOR
-- ---------------------------------------------------------------------

-- Claim Order for Courier Dispatch (Atomic Lease)
CREATE OR REPLACE FUNCTION public.claim_order_for_dispatch(
    p_order_id UUID,
    p_courier_code TEXT,
    p_admin_id UUID,
    p_lease_seconds INT DEFAULT 300
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_existing_claim public.courier_dispatch_claims%ROWTYPE;
    v_claim_token TEXT := gen_random_uuid()::text;
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    -- Authorization: either caller is authenticated admin or backend service_role with authorized admin_id
    IF v_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
        IF p_admin_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = p_admin_id AND role IN ('super_admin', 'order_manager')
        ) THEN
            RAISE EXCEPTION 'Unauthorized: specified admin_id is not an authorized order manager'
                USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NOT NULL THEN
        IF NOT public.current_user_is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: caller must be an authenticated administrator'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order % not found', p_order_id USING ERRCODE = 'P0001';
    END IF;

    IF v_order.status NOT IN ('confirmed', 'processing') THEN
        RAISE EXCEPTION 'Order % is in status "%" and cannot be dispatched (must be confirmed or processing)',
            v_order.order_number, v_order.status USING ERRCODE = 'P0001';
    END IF;

    IF EXISTS (SELECT 1 FROM public.courier_shipments WHERE order_id = p_order_id) THEN
        RAISE EXCEPTION 'Order % has already been dispatched', v_order.order_number USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_existing_claim
    FROM public.courier_dispatch_claims
    WHERE order_id = p_order_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing_claim.status = 'dispatched' THEN
            RAISE EXCEPTION 'Order has already been dispatched' USING ERRCODE = 'P0001';
        ELSIF v_existing_claim.status = 'claimed' AND v_existing_claim.lease_expires_at > NOW() THEN
            RAISE EXCEPTION 'Dispatch is already actively being processed by an administrator. Please wait % seconds',
                EXTRACT(EPOCH FROM (v_existing_claim.lease_expires_at - NOW()))::int
                USING ERRCODE = '40001';
        ELSE
            UPDATE public.courier_dispatch_claims
            SET courier_code = p_courier_code,
                claimed_by = p_admin_id,
                claim_token = v_claim_token,
                status = 'claimed',
                claimed_at = NOW(),
                lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::interval,
                retry_count = retry_count + 1
            WHERE order_id = p_order_id;
        END IF;
    ELSE
        INSERT INTO public.courier_dispatch_claims (
            order_id, courier_code, claimed_by, claim_token, status,
            claimed_at, lease_expires_at, retry_count
        ) VALUES (
            p_order_id, p_courier_code, p_admin_id, v_claim_token, 'claimed',
            NOW(), NOW() + (p_lease_seconds || ' seconds')::interval, 1
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'claim_token', v_claim_token,
        'order', jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'customer_name', v_order.customer_name,
            'customer_phone', v_order.customer_phone,
            'shipping_address', v_order.shipping_address,
            'cod_amount', v_order.total
        )
    );
END;
$$;

-- Finalize Order Dispatch
CREATE OR REPLACE FUNCTION public.finalize_order_dispatch(
    p_order_id UUID,
    p_claim_token TEXT,
    p_admin_id UUID,
    p_courier_code TEXT,
    p_consignment_id TEXT,
    p_tracking_code TEXT,
    p_dispatch_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order public.orders%ROWTYPE;
    v_claim public.courier_dispatch_claims%ROWTYPE;
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role = 'service_role' OR session_user IN ('postgres', 'supabase_admin') THEN
        IF p_admin_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = p_admin_id AND role IN ('super_admin', 'order_manager')
        ) THEN
            RAISE EXCEPTION 'Unauthorized: specified admin_id is not an authorized order manager'
                USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NOT NULL THEN
        IF NOT public.current_user_is_admin() THEN
            RAISE EXCEPTION 'Unauthorized: caller must be an authenticated administrator'
                USING ERRCODE = '42501';
        END IF;
    ELSE
        RAISE EXCEPTION 'Unauthorized: authentication required' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_claim
    FROM public.courier_dispatch_claims
    WHERE order_id = p_order_id AND claim_token = p_claim_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or missing dispatch claim token for order %', p_order_id USING ERRCODE = 'P0001';
    END IF;

    IF v_claim.status != 'claimed' OR v_claim.lease_expires_at < NOW() THEN
        RAISE EXCEPTION 'Dispatch claim has expired or is invalid' USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    INSERT INTO public.courier_shipments (
        order_id, courier_code, consignment_id, tracking_code, invoice_number,
        status, cod_amount, dispatch_payload, created_at, updated_at
    ) VALUES (
        p_order_id, p_courier_code, p_consignment_id, p_tracking_code, v_order.order_number,
        'in_review', v_order.total, p_dispatch_payload, NOW(), NOW()
    );

    UPDATE public.orders
    SET status = 'shipped',
        courier_code = p_courier_code,
        tracking_number = p_tracking_code,
        consignment_id = p_consignment_id,
        shipped_at = COALESCE(shipped_at, NOW()),
        updated_at = NOW()
    WHERE id = p_order_id;

    UPDATE public.courier_dispatch_claims
    SET status = 'dispatched',
        lease_expires_at = NOW() + INTERVAL '1 year'
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', p_order_id,
        'consignment_id', p_consignment_id,
        'tracking_code', p_tracking_code
    );
END;
$$;

-- Release Order Dispatch Claim
CREATE OR REPLACE FUNCTION public.release_order_dispatch_claim(
    p_order_id UUID,
    p_claim_token TEXT,
    p_admin_id UUID,
    p_error_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_claim public.courier_dispatch_claims%ROWTYPE;
BEGIN
    SELECT * INTO v_claim
    FROM public.courier_dispatch_claims
    WHERE order_id = p_order_id AND claim_token = p_claim_token
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    UPDATE public.courier_dispatch_claims
    SET status = 'failed',
        last_error = p_error_message,
        lease_expires_at = NOW()
    WHERE order_id = p_order_id AND claim_token = p_claim_token;
END;
$$;

-- Idempotent Steadfast Webhook Processor
CREATE OR REPLACE FUNCTION public.process_steadfast_webhook(
    p_event_id TEXT,
    p_consignment_id TEXT,
    p_invoice TEXT,
    p_status TEXT,
    p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_event public.courier_webhook_events%ROWTYPE;
    v_shipment public.courier_shipments%ROWTYPE;
    v_order public.orders%ROWTYPE;
    v_target_order_status TEXT;
    v_target_payment_status TEXT;
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role != 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: only service_role can execute courier webhook processor'
            USING ERRCODE = '42501';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('sf_webhook_' || p_event_id));

    SELECT * INTO v_event
    FROM public.courier_webhook_events
    WHERE event_id = p_event_id;

    IF FOUND AND v_event.processing_status = 'processed' THEN
        RETURN jsonb_build_object('success', TRUE, 'message', 'Event already processed', 'duplicate', TRUE);
    END IF;

    IF NOT FOUND THEN
        INSERT INTO public.courier_webhook_events (
            event_id, consignment_id, invoice_number, status, payload, processing_status, created_at
        ) VALUES (
            p_event_id, p_consignment_id, p_invoice, p_status, p_payload, 'processing', NOW()
        );
    END IF;

    SELECT * INTO v_shipment
    FROM public.courier_shipments
    WHERE consignment_id = p_consignment_id OR invoice_number = p_invoice
    FOR UPDATE;

    IF NOT FOUND THEN
        UPDATE public.courier_webhook_events
        SET processing_status = 'failed', error_message = 'Consignment or invoice not found'
        WHERE event_id = p_event_id;

        RAISE EXCEPTION 'Shipment with consignment_id % / invoice % not found', p_consignment_id, p_invoice
            USING ERRCODE = 'P0001';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE id = v_shipment.order_id
    FOR UPDATE;

    IF p_status = 'delivered' THEN
        v_target_order_status := 'delivered';
        v_target_payment_status := 'paid';
    ELSIF p_status IN ('cancelled', 'delivery_returned', 'returned') THEN
        v_target_order_status := 'returned';
        v_target_payment_status := v_order.payment_status;
    ELSE
        v_target_order_status := v_order.status;
        v_target_payment_status := v_order.payment_status;
    END IF;

    IF v_order.status = 'delivered' AND v_target_order_status != 'delivered' THEN
        v_target_order_status := 'delivered';
    END IF;

    UPDATE public.courier_shipments
    SET status = p_status, updated_at = NOW()
    WHERE id = v_shipment.id;

    IF v_order.status != v_target_order_status OR v_order.payment_status != v_target_payment_status THEN
        UPDATE public.orders
        SET status = v_target_order_status,
            payment_status = v_target_payment_status,
            updated_at = NOW()
        WHERE id = v_order.id;
    END IF;

    UPDATE public.courier_webhook_events
    SET processing_status = 'processed', processed_at = NOW()
    WHERE event_id = p_event_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_number', v_order.order_number,
        'courier_status', p_status,
        'order_status', v_target_order_status
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 12: INVOICE GENERATION QUEUE HELPERS (BACKGROUND WORKER)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_invoice_queue_jobs(
    p_worker_id TEXT,
    p_batch_size INT DEFAULT 10,
    p_lease_seconds INT DEFAULT 180
)
RETURNS TABLE (
    job_id UUID,
    order_id UUID,
    order_number TEXT,
    snapshot_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role != 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: only service_role can claim invoice queue jobs'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH available_jobs AS (
        SELECT q.id
        FROM public.invoice_generation_queue q
        WHERE (q.status = 'queued')
           OR (q.status = 'processing' AND q.lease_expires_at < NOW())
           OR (q.status = 'failed' AND q.attempts < q.max_attempts AND q.updated_at < (NOW() - (q.attempts * INTERVAL '2 minutes')))
        ORDER BY q.created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ),
    claimed AS (
        UPDATE public.invoice_generation_queue q
        SET status = 'processing',
            claimed_by = p_worker_id,
            claimed_at = NOW(),
            lease_expires_at = NOW() + (p_lease_seconds || ' seconds')::interval,
            attempts = q.attempts + 1,
            updated_at = NOW()
        FROM available_jobs a
        WHERE q.id = a.id
        RETURNING q.id, q.order_id
    )
    SELECT
        c.id AS job_id,
        c.order_id,
        o.order_number,
        i.snapshot_data
    FROM claimed c
    JOIN public.orders o ON o.id = c.order_id
    JOIN public.invoices i ON i.order_id = c.order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_invoice_queue_job(
    p_job_id UUID,
    p_pdf_url TEXT,
    p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_order_id UUID;
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role != 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: only service_role can complete invoice queue jobs'
            USING ERRCODE = '42501';
    END IF;

    IF p_pdf_url IS NULL OR length(trim(p_pdf_url)) = 0 THEN
        RAISE EXCEPTION 'pdf_url must not be null or empty' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.invoice_generation_queue
    SET status = 'completed',
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id AND claimed_by = p_worker_id AND lease_expires_at > NOW()
    RETURNING order_id INTO v_order_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    UPDATE public.invoices
    SET pdf_url = trim(p_pdf_url),
        updated_at = NOW()
    WHERE order_id = v_order_id;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_invoice_queue_job(
    p_job_id UUID,
    p_error_message TEXT,
    p_worker_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role != 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Unauthorized: only service_role can fail invoice queue jobs'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.invoice_generation_queue
    SET status = CASE WHEN attempts >= max_attempts THEN 'failed' ELSE 'queued' END,
        error_message = p_error_message,
        lease_expires_at = NULL,
        updated_at = NOW()
    WHERE id = p_job_id AND claimed_by = p_worker_id;
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 13: ADMINISTRATIVE BOOTSTRAP & ROUTINE MAINTENANCE
-- ---------------------------------------------------------------------

-- Privilege-Escalation Shield: Strictly restricted to service_role or DB Superuser
CREATE OR REPLACE FUNCTION public.bootstrap_super_admin(
    p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
    IF v_role != 'service_role' AND session_user NOT IN ('postgres', 'supabase_admin') THEN
        RAISE EXCEPTION 'Privilege escalation blocked: bootstrap_super_admin can only be executed by database owner or service_role.'
            USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

-- Routine Security Cleanup Function
CREATE OR REPLACE FUNCTION public.routine_security_cleanup()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.checkout_idempotency_keys WHERE expires_at < NOW();
    DELETE FROM public.guest_tracking_rate_limits WHERE window_start < NOW() - INTERVAL '24 hours';
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 14: ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkout_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_dispatch_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_tracking_rate_limits ENABLE ROW LEVEL SECURITY;

-- 14.1 Profiles
CREATE POLICY "Profiles are viewable by owner or admin"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.current_user_is_admin());

CREATE POLICY "Profiles can be updated by owner"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- 14.2 User Roles
CREATE POLICY "User roles viewable by self or super_admin"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.current_user_is_super_admin());

CREATE POLICY "User roles manageable only by super_admin"
    ON public.user_roles FOR ALL
    USING (public.current_user_is_super_admin());

-- 14.3 Admin Activity Logs
CREATE POLICY "Activity logs viewable only by super_admin"
    ON public.admin_activity_logs FOR SELECT
    USING (public.current_user_is_super_admin());

-- 14.4 System Secrets
CREATE POLICY "System secrets manageable only by super_admin"
    ON public.system_secrets FOR ALL
    USING (public.current_user_is_super_admin());

-- 14.5 Categories
CREATE POLICY "Active categories are publicly viewable"
    ON public.categories FOR SELECT
    USING (is_active = TRUE OR public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Categories manageable by product_manager or super_admin"
    ON public.categories FOR ALL
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

-- 14.6 Products
CREATE POLICY "Active products are publicly viewable"
    ON public.products FOR SELECT
    USING (is_active = TRUE OR public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Products manageable by product_manager or super_admin"
    ON public.products FOR ALL
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

-- 14.7 Product Images
CREATE POLICY "Product images are publicly viewable"
    ON public.product_images FOR SELECT
    USING (TRUE);

CREATE POLICY "Product images manageable by product_manager or super_admin"
    ON public.product_images FOR ALL
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

-- 14.8 Product Variants (Direct table access restricted to staff)
CREATE POLICY "Variants viewable by product_manager or super_admin"
    ON public.product_variants FOR SELECT
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Variants manageable by product_manager or super_admin"
    ON public.product_variants FOR ALL
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

-- 14.9 Inventory Movements
CREATE POLICY "Inventory movements viewable by product_manager or super_admin"
    ON public.inventory_movements FOR SELECT
    USING (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin());

-- 14.10 Store Settings & Theme
CREATE POLICY "Store settings publicly viewable"
    ON public.store_settings FOR SELECT
    USING (TRUE);

CREATE POLICY "Store settings manageable only by super_admin"
    ON public.store_settings FOR ALL
    USING (public.current_user_is_super_admin());

CREATE POLICY "Theme customizations publicly viewable"
    ON public.theme_customizations FOR SELECT
    USING (TRUE);

CREATE POLICY "Theme customizations manageable by content_manager or super_admin"
    ON public.theme_customizations FOR ALL
    USING (public.current_user_has_role('content_manager') OR public.current_user_is_super_admin());

-- 14.11 Banners & Sections
CREATE POLICY "Active banners publicly viewable"
    ON public.banners FOR SELECT
    USING (is_active = TRUE OR public.current_user_has_role('content_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Banners manageable by content_manager or super_admin"
    ON public.banners FOR ALL
    USING (public.current_user_has_role('content_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Homepage sections publicly viewable"
    ON public.homepage_sections FOR SELECT
    USING (is_active = TRUE OR public.current_user_has_role('content_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Homepage sections manageable by content_manager or super_admin"
    ON public.homepage_sections FOR ALL
    USING (public.current_user_has_role('content_manager') OR public.current_user_is_super_admin());

-- 14.12 Coupons
CREATE POLICY "Active coupons viewable by authenticated users or anon"
    ON public.coupons FOR SELECT
    USING (is_active = TRUE OR public.current_user_is_admin());

CREATE POLICY "Coupons manageable by super_admin"
    ON public.coupons FOR ALL
    USING (public.current_user_is_super_admin());

-- 14.13 Customer Addresses
CREATE POLICY "Customer addresses viewable by owner or order_manager"
    ON public.customer_addresses FOR SELECT
    USING (auth.uid() = customer_id OR public.current_user_has_role('order_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Customer addresses insertable by owner"
    ON public.customer_addresses FOR INSERT
    WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customer addresses manageable by owner"
    ON public.customer_addresses FOR UPDATE
    USING (auth.uid() = customer_id);

CREATE POLICY "Customer addresses deletable by owner"
    ON public.customer_addresses FOR DELETE
    USING (auth.uid() = customer_id);

-- 14.14 Orders
CREATE POLICY "Orders viewable by customer owner, order_manager, or super_admin"
    ON public.orders FOR SELECT
    USING (
        auth.uid() = customer_id 
        OR public.current_user_has_role('order_manager') 
        OR public.current_user_is_super_admin()
    );

CREATE POLICY "Orders updatable by order_manager or super_admin"
    ON public.orders FOR UPDATE
    USING (
        public.current_user_has_role('order_manager') 
        OR public.current_user_is_super_admin()
    );

-- 14.15 Order Items
CREATE POLICY "Order items viewable by order owner, order_manager, or super_admin"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_items.order_id 
              AND (o.customer_id = auth.uid() OR public.current_user_has_role('order_manager') OR public.current_user_is_super_admin())
        )
    );

-- 14.16 Order Status History
CREATE POLICY "Status history viewable by order owner or staff"
    ON public.order_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = order_status_history.order_id 
              AND (o.customer_id = auth.uid() OR public.current_user_is_admin())
        )
    );

-- 14.17 Invoices
CREATE POLICY "Invoices viewable by order owner or staff"
    ON public.invoices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = invoices.order_id 
              AND (o.customer_id = auth.uid() OR public.current_user_has_role('order_manager') OR public.current_user_is_super_admin())
        )
    );

-- 14.18 Invoice Generation Queue
CREATE POLICY "Invoice queue accessible only by service_role"
    ON public.invoice_generation_queue FOR ALL
    USING (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.current_user_is_super_admin());

-- 14.19 Couriers & Shipments
CREATE POLICY "Couriers viewable by authenticated users or staff"
    ON public.couriers FOR SELECT
    USING (TRUE);

CREATE POLICY "Couriers manageable by super_admin"
    ON public.couriers FOR ALL
    USING (public.current_user_is_super_admin());

CREATE POLICY "Courier shipments viewable by order owner, order_manager, or super_admin"
    ON public.courier_shipments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders o 
            WHERE o.id = courier_shipments.order_id 
              AND (o.customer_id = auth.uid() OR public.current_user_has_role('order_manager') OR public.current_user_is_super_admin())
        )
    );

CREATE POLICY "Courier shipments manageable by order_manager or super_admin"
    ON public.courier_shipments FOR ALL
    USING (public.current_user_has_role('order_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Courier dispatch claims viewable and manageable by order_manager or super_admin"
    ON public.courier_dispatch_claims FOR ALL
    USING (public.current_user_has_role('order_manager') OR public.current_user_is_super_admin());

CREATE POLICY "Webhook events accessible only by service_role"
    ON public.courier_webhook_events FOR ALL
    USING (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.current_user_is_super_admin());

-- 14.20 Notifications
CREATE POLICY "Notifications viewable and updatable by recipient"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id);

-- 14.21 Checkout Idempotency & Rate Limits
CREATE POLICY "Idempotency keys accessible only by service_role"
    ON public.checkout_idempotency_keys FOR ALL
    USING (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.current_user_is_super_admin());

CREATE POLICY "Rate limits accessible only by service_role"
    ON public.guest_tracking_rate_limits FOR ALL
    USING (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.current_user_is_super_admin());

-- ---------------------------------------------------------------------
-- SECTION 15: SUPABASE STORAGE BUCKETS & POLICIES
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('product-images', 'product-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('banner-images', 'banner-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
    ('avatar-images', 'avatar-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('site-assets', 'site-assets', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE 
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Product Images Storage
CREATE POLICY "Product images publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Product images uploadable by product_manager or super_admin"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-images' AND (public.current_user_has_role('product_manager') OR public.current_user_is_super_admin()));

-- Banner Images Storage
CREATE POLICY "Banner images publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'banner-images');

CREATE POLICY "Banner images uploadable by content_manager or super_admin"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'banner-images' AND (public.current_user_has_role('content_manager') OR public.current_user_is_super_admin()));

-- Avatar Images Storage (Folder Isolation per User ID)
CREATE POLICY "Avatar images publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatar-images');

CREATE POLICY "Avatars uploadable by owner to their own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'avatar-images' 
        AND auth.uid() IS NOT NULL 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

CREATE POLICY "Avatars updatable by owner in their own folder"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'avatar-images' 
        AND auth.uid() IS NOT NULL 
        AND (storage.foldername(name))[1] = auth.uid()::TEXT
    );

-- Invoices Storage (Private Bucket)
CREATE POLICY "Invoices readable by order owner, order_manager or super_admin"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'invoices' 
        AND (
            public.current_user_has_role('order_manager') 
            OR public.current_user_is_super_admin()
            OR (
                auth.uid() IS NOT NULL 
                AND EXISTS (
                    SELECT 1 FROM public.orders 
                    WHERE order_number = (storage.foldername(name))[1] 
                      AND customer_id = auth.uid()
                )
            )
        )
    );

CREATE POLICY "Invoices uploadable only by service_role or super_admin"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'invoices' 
        AND (current_setting('request.jwt.claim.role', true) = 'service_role' OR public.current_user_is_super_admin())
    );

-- ---------------------------------------------------------------------
-- SECTION 16: INITIAL BASELINE SYSTEM CONFIGURATION (ZERO DEMO DATA)
-- ---------------------------------------------------------------------

INSERT INTO public.store_settings (
    store_name,
    tagline,
    official_domain,
    support_email,
    support_phone,
    whatsapp_number,
    studio_address,
    currency,
    currency_symbol,
    free_shipping_threshold,
    dhaka_delivery_fee,
    outside_dhaka_delivery_fee,
    is_maintenance_mode
) VALUES (
    'Eleven Nation',
    'Wear Your Identity.',
    'elevennation.shop',
    'elevennation.support@gmail.com',
    '+880 1700-000000',
    '+880 1700-000000',
    'House 11, Road 7, Sector 3, Uttara, Dhaka 1230, Bangladesh',
    'BDT',
    '৳',
    2500.00,
    80.00,
    130.00,
    FALSE
) ON CONFLICT DO NOTHING;

INSERT INTO public.theme_customizations (
    hero_title,
    hero_subtitle,
    announcement_text,
    announcement_active
) VALUES (
    'Modern Streetwear & Matchday Classics',
    'Engineered for the pitch and the streets of Bangladesh.',
    'Cash on Delivery Across All 64 Districts in Bangladesh. Free Shipping on Orders Over ৳2,500.',
    TRUE
) ON CONFLICT DO NOTHING;

INSERT INTO public.couriers (code, name, is_active)
VALUES 
    ('steadfast', 'Steadfast Courier', TRUE),
    ('manual', 'Manual Courier / Self Delivery', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- SECTION 17: LEAST-PRIVILEGE GRANTS & REVOKES
-- ---------------------------------------------------------------------

REVOKE ALL ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.order_items FROM anon, authenticated;
REVOKE ALL ON public.order_status_history FROM anon, authenticated;
REVOKE ALL ON public.admin_activity_logs FROM anon, authenticated;
REVOKE ALL ON public.inventory_movements FROM anon, authenticated;
REVOKE ALL ON public.system_secrets FROM anon, authenticated;
REVOKE ALL ON public.checkout_idempotency_keys FROM anon, authenticated;
REVOKE ALL ON public.guest_tracking_rate_limits FROM anon, authenticated;
REVOKE ALL ON public.invoice_generation_queue FROM anon, authenticated;
REVOKE ALL ON public.courier_webhook_events FROM anon, authenticated;
REVOKE ALL ON public.courier_dispatch_claims FROM anon, authenticated;

-- Grant selective SELECT where controlled by RLS
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.public_product_variants TO anon, authenticated;
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT SELECT ON public.theme_customizations TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT SELECT ON public.customer_addresses TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT ON public.couriers TO anon, authenticated;
GRANT SELECT ON public.courier_shipments TO authenticated;

-- Grant RPC execution
GRANT EXECUTE ON FUNCTION public.place_order_atomic TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.track_guest_order TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_super_admin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_admin TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_has_role TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.claim_order_for_dispatch TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_dispatch TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_order_dispatch_claim TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_steadfast_webhook TO service_role;

GRANT EXECUTE ON FUNCTION public.claim_invoice_queue_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_invoice_queue_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_invoice_queue_job TO service_role;

REVOKE EXECUTE ON FUNCTION public.bootstrap_super_admin FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_super_admin TO service_role;

REVOKE EXECUTE ON FUNCTION public.routine_security_cleanup FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.routine_security_cleanup TO service_role;

-- =====================================================================
-- END OF ELEVEN NATION DEFINITIVE FRESH PRODUCTION RELEASE SCRIPT
-- =====================================================================
