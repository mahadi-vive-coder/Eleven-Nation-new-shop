-- =====================================================================
-- ELEVEN NATION (elevennation.shop) — PRODUCTION FRESH INSTALL SQL
-- Version: 7.2.0 (Final Production Candidate)
-- Target Engine: PostgreSQL 15+ / Supabase
--
-- BUSINESS RULES:
-- 1. Currency: Bangladeshi Taka (BDT, ৳) strictly.
-- 2. Payment Method: Cash on Delivery (COD) strictly.
-- 3. Courier: Steadfast Courier as primary courier partner.
-- 4. Sizes: S, M, L, XL, XXL (independent variant stock).
-- 5. Checkout: Registered customer & Guest checkout supported.
-- 6. Zero fabricated demo catalog, demo customer, or placeholder data.
-- =====================================================================

-- ---------------------------------------------------------------------
-- SECTION 01: PREREQUISITES & EXTENSIONS
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Schema migrations table to track applied versions
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- SECTION 02: CORE RBAC & SECURITY HELPER FUNCTIONS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'super_admin', 'order_manager', 'product_manager', 'content_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

CREATE OR REPLACE FUNCTION public.current_user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() = 'service_role' THEN
        RETURN TRUE;
    END IF;
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('super_admin', 'order_manager', 'product_manager', 'content_manager')
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 03: SYSTEM SECRETS CONFIGURATION
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_secrets (
    key_name TEXT PRIMARY KEY,
    key_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON public.system_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.system_secrets TO service_role;

CREATE OR REPLACE PROCEDURE public.configure_system_secrets(
    p_rate_limit_pepper TEXT,
    p_steadfast_api_key TEXT DEFAULT NULL,
    p_steadfast_secret_key TEXT DEFAULT NULL,
    p_steadfast_webhook_secret TEXT DEFAULT NULL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.role() != 'service_role' AND (auth.uid() IS NULL OR NOT public.current_user_is_super_admin()) THEN
        RAISE EXCEPTION 'Unauthorized: only super_admin or service_role can configure system secrets'
            USING ERRCODE = '42501';
    END IF;

    IF p_rate_limit_pepper IS NULL OR length(trim(p_rate_limit_pepper)) < 32 THEN
        RAISE EXCEPTION 'Security error: rate limit pepper must be at least 32 characters long'
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.system_secrets (key_name, key_value, description, updated_at)
    VALUES ('rate_limit_pepper', trim(p_rate_limit_pepper), 'Pepper for guest IP HMAC hashing', NOW())
    ON CONFLICT (key_name) DO UPDATE
    SET key_value = EXCLUDED.key_value, updated_at = NOW();

    IF p_steadfast_api_key IS NOT NULL AND length(trim(p_steadfast_api_key)) > 0 THEN
        INSERT INTO public.system_secrets (key_name, key_value, description, updated_at)
        VALUES ('steadfast_api_key', trim(p_steadfast_api_key), 'Steadfast Courier API Key', NOW())
        ON CONFLICT (key_name) DO UPDATE
        SET key_value = EXCLUDED.key_value, updated_at = NOW();
    END IF;

    IF p_steadfast_secret_key IS NOT NULL AND length(trim(p_steadfast_secret_key)) > 0 THEN
        INSERT INTO public.system_secrets (key_name, key_value, description, updated_at)
        VALUES ('steadfast_secret_key', trim(p_steadfast_secret_key), 'Steadfast Courier Secret Key', NOW())
        ON CONFLICT (key_name) DO UPDATE
        SET key_value = EXCLUDED.key_value, updated_at = NOW();
    END IF;

    IF p_steadfast_webhook_secret IS NOT NULL AND length(trim(p_steadfast_webhook_secret)) > 0 THEN
        INSERT INTO public.system_secrets (key_name, key_value, description, updated_at)
        VALUES ('steadfast_webhook_secret', trim(p_steadfast_webhook_secret), 'Steadfast Inbound Webhook Secret Token', NOW())
        ON CONFLICT (key_name) DO UPDATE
        SET key_value = EXCLUDED.key_value, updated_at = NOW();
    END IF;
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 04: AUDIT TRAILS & STRICT APPEND-ONLY ENFORCEMENT
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_admin ON public.admin_activity_logs (admin_id);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON public.admin_activity_logs (resource_type, resource_id);

CREATE OR REPLACE FUNCTION public.enforce_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_old_json JSONB;
    v_new_json JSONB;
    v_key TEXT;
    v_allowed_keys TEXT[];
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Table % is strictly append-only: DELETE operations are prohibited', TG_TABLE_NAME
            USING ERRCODE = '42501';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF TG_TABLE_NAME = 'admin_activity_logs' THEN
            v_allowed_keys := ARRAY['admin_id'];
        ELSIF TG_TABLE_NAME = 'inventory_movements' THEN
            v_allowed_keys := ARRAY['variant_id', 'changed_by'];
        ELSIF TG_TABLE_NAME = 'order_status_history' THEN
            v_allowed_keys := ARRAY['changed_by'];
        ELSIF TG_TABLE_NAME = 'order_items' THEN
            v_allowed_keys := ARRAY[]::TEXT[];
        ELSE
            v_allowed_keys := ARRAY[]::TEXT[];
        END IF;

        v_old_json := to_jsonb(OLD);
        v_new_json := to_jsonb(NEW);

        FOR v_key IN SELECT jsonb_object_keys(v_old_json)
        LOOP
            IF (v_old_json ->> v_key) IS DISTINCT FROM (v_new_json ->> v_key) THEN
                IF (v_key = ANY(v_allowed_keys)) AND (v_new_json ->> v_key) IS NULL THEN
                    CONTINUE;
                ELSE
                    RAISE EXCEPTION 'Table % is strictly append-only: modifying column "%" is prohibited', TG_TABLE_NAME, v_key
                        USING ERRCODE = '42501';
                END IF;
            END IF;
        END LOOP;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_logs_append_only ON public.admin_activity_logs;
CREATE TRIGGER trg_audit_logs_append_only
BEFORE UPDATE OR DELETE ON public.admin_activity_logs
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

-- ---------------------------------------------------------------------
-- SECTION 05: CATALOG, VARIANTS, VIEW & INVENTORY AUDIT
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    discount_price NUMERIC(10, 2) CHECK (discount_price IS NULL OR (discount_price >= 0 AND discount_price <= base_price)),
    is_customizable BOOLEAN NOT NULL DEFAULT FALSE,
    customization_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (customization_charge >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    meta_title TEXT,
    meta_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (is_active);

CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    alt_text TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON public.product_images (product_id);

CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL CHECK (size IN ('S', 'M', 'L', 'XL', 'XXL')),
    color TEXT NOT NULL DEFAULT 'Standard',
    sku TEXT UNIQUE,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color)
);

DROP TRIGGER IF EXISTS trg_product_variants_updated_at ON public.product_variants;
CREATE TRIGGER trg_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_variants_product ON public.product_variants (product_id);

CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    change_type TEXT NOT NULL CHECK (change_type IN ('order_placed', 'order_cancelled', 'order_returned', 'manual_adjustment', 'restock')),
    quantity_changed INT NOT NULL,
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id TEXT,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_inventory_movements_append_only ON public.inventory_movements;
CREATE TRIGGER trg_inventory_movements_append_only
BEFORE UPDATE OR DELETE ON public.inventory_movements
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

CREATE INDEX IF NOT EXISTS idx_inventory_variant ON public.inventory_movements (variant_id);

CREATE OR REPLACE VIEW public.public_product_variants AS
SELECT
    id,
    product_id,
    size,
    color,
    sku,
    is_active,
    (stock > 0) AS in_stock,
    created_at,
    updated_at
FROM public.product_variants
WHERE is_active = TRUE;

-- ---------------------------------------------------------------------
-- SECTION 06: STORE SETTINGS, THEME & CONTENT
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.store_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    store_name TEXT NOT NULL DEFAULT 'Eleven Nation',
    store_email TEXT NOT NULL DEFAULT '',
    store_phone TEXT NOT NULL DEFAULT '',
    delivery_charge_inside_dhaka NUMERIC(10, 2) NOT NULL DEFAULT 80.00 CHECK (delivery_charge_inside_dhaka >= 0),
    delivery_charge_outside_dhaka NUMERIC(10, 2) NOT NULL DEFAULT 150.00 CHECK (delivery_charge_outside_dhaka >= 0),
    free_delivery_threshold NUMERIC(10, 2) CHECK (free_delivery_threshold IS NULL OR free_delivery_threshold >= 0),
    is_store_open BOOLEAN NOT NULL DEFAULT TRUE,
    closure_notice TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.theme_customizations (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    primary_color TEXT NOT NULL DEFAULT '#000000',
    accent_color TEXT NOT NULL DEFAULT '#E63946',
    announcement_bar_text TEXT,
    announcement_bar_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    hero_headline TEXT,
    hero_subheadline TEXT,
    hero_button_text TEXT,
    hero_button_link TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    mobile_image_url TEXT,
    link_url TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.homepage_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    section_type TEXT NOT NULL CHECK (section_type IN ('featured_categories', 'new_arrivals', 'bestsellers', 'banner_grid', 'custom_html')),
    content JSONB NOT NULL DEFAULT '{}'::jsonb,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (min_order_amount >= 0),
    max_discount_amount NUMERIC(10, 2) CHECK (max_discount_amount IS NULL OR max_discount_amount > 0),
    usage_limit INT CHECK (usage_limit IS NULL OR usage_limit > 0),
    used_count INT NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    alternative_phone TEXT,
    district TEXT NOT NULL,
    delivery_zone TEXT NOT NULL CHECK (delivery_zone IN ('inside_dhaka', 'outside_dhaka')),
    full_address TEXT NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user ON public.customer_addresses (user_id);

-- ---------------------------------------------------------------------
-- SECTION 07: ORDERS, ITEMS, STATUS TIMELINE & IDEMPOTENCY
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    shipping_address TEXT NOT NULL,
    delivery_zone TEXT NOT NULL CHECK (delivery_zone IN ('inside_dhaka', 'outside_dhaka')),
    customer_note TEXT,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    delivery_charge NUMERIC(10, 2) NOT NULL CHECK (delivery_charge >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method = 'COD'),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')),
    courier_code TEXT CHECK (courier_code IN ('steadfast', 'manual')),
    tracking_number TEXT,
    consignment_id TEXT,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    coupon_code TEXT,
    stock_restored BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON public.orders (customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders (order_number);

CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    custom_name TEXT,
    custom_number TEXT,
    customization_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (customization_charge >= 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items (order_id);

DROP TRIGGER IF EXISTS trg_order_items_append_only ON public.order_items;
CREATE TRIGGER trg_order_items_append_only
BEFORE UPDATE OR DELETE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_order ON public.order_status_history (order_id);

DROP TRIGGER IF EXISTS trg_status_history_append_only ON public.order_status_history;
CREATE TRIGGER trg_status_history_append_only
BEFORE UPDATE OR DELETE ON public.order_status_history
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

-- Strict Order Update & State Machine Trigger
CREATE OR REPLACE FUNCTION public.validate_order_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Financial immutability
    IF OLD.subtotal IS DISTINCT FROM NEW.subtotal OR
       OLD.delivery_charge IS DISTINCT FROM NEW.delivery_charge OR
       OLD.discount_amount IS DISTINCT FROM NEW.discount_amount OR
       OLD.total IS DISTINCT FROM NEW.total OR
       OLD.payment_method IS DISTINCT FROM NEW.payment_method OR
       OLD.order_number IS DISTINCT FROM NEW.order_number OR
       OLD.user_id IS DISTINCT FROM NEW.user_id THEN
        RAISE EXCEPTION 'Financial and ownership fields of an order are strictly immutable'
            USING ERRCODE = 'P0001';
    END IF;

    -- Protect stock_restored
    IF OLD.stock_restored IS DISTINCT FROM NEW.stock_restored THEN
        IF OLD.stock_restored = TRUE AND NEW.stock_restored = FALSE THEN
            RAISE EXCEPTION 'stock_restored flag cannot be reverted once set'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;

    -- Explicit, validated Order Status Transition Matrix
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Allowed:
        -- pending -> confirmed, cancelled
        -- confirmed -> processing, shipped, cancelled
        -- processing -> shipped, cancelled
        -- shipped -> delivered, returned
        -- Terminal: delivered, cancelled, returned (no transitions permitted)
        IF OLD.status = 'pending' AND NEW.status NOT IN ('confirmed', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid transition from pending to %', NEW.status USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'confirmed' AND NEW.status NOT IN ('processing', 'shipped', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid transition from confirmed to %', NEW.status USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'processing' AND NEW.status NOT IN ('shipped', 'cancelled') THEN
            RAISE EXCEPTION 'Invalid transition from processing to %', NEW.status USING ERRCODE = 'P0001';
        ELSIF OLD.status = 'shipped' AND NEW.status NOT IN ('delivered', 'returned') THEN
            RAISE EXCEPTION 'Invalid transition from shipped to %', NEW.status USING ERRCODE = 'P0001';
        ELSIF OLD.status IN ('delivered', 'cancelled', 'returned') THEN
            RAISE EXCEPTION 'Terminal order state % cannot be transitioned to %', OLD.status, NEW.status USING ERRCODE = 'P0001';
        END IF;

        INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, comment)
        VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), 'State transition enforced via database state machine');

        -- Automatic inventory restoration on terminal cancelled/returned state
        IF NEW.status IN ('cancelled', 'returned') AND NOT OLD.stock_restored THEN
            INSERT INTO public.inventory_movements (variant_id, change_type, quantity_changed, previous_stock, new_stock, reference_id, changed_by, notes)
            SELECT
                oi.variant_id,
                CASE WHEN NEW.status = 'cancelled' THEN 'order_cancelled' ELSE 'order_returned' END,
                oi.quantity,
                pv.stock,
                pv.stock + oi.quantity,
                NEW.order_number,
                auth.uid(),
                'Restocked automatically on status transition to ' || NEW.status
            FROM public.order_items oi
            JOIN public.product_variants pv ON pv.id = oi.variant_id
            WHERE oi.order_id = NEW.id AND oi.variant_id IS NOT NULL;

            UPDATE public.product_variants pv
            SET stock = pv.stock + oi.quantity, updated_at = NOW()
            FROM public.order_items oi
            WHERE oi.order_id = NEW.id AND oi.variant_id = pv.id;

            NEW.stock_restored := TRUE;
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_order_update ON public.orders;
CREATE TRIGGER trg_validate_order_update
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.validate_order_update();

CREATE TABLE IF NOT EXISTS public.checkout_idempotency_keys (
    key TEXT PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON public.checkout_idempotency_keys (expires_at);

CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
    invoice_number TEXT NOT NULL UNIQUE,
    pdf_url TEXT,
    snapshot_data JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_generation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE UNIQUE,
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
-- SECTION 08: COURIER ARCHITECTURE & DISPATCH CLAIMS
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.couriers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE CHECK (code IN ('steadfast', 'manual')),
    name TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.courier_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT UNIQUE,
    courier_code TEXT NOT NULL DEFAULT 'steadfast',
    consignment_id TEXT NOT NULL,
    tracking_code TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_review',
    cod_amount NUMERIC(10, 2) NOT NULL CHECK (cod_amount >= 0),
    dispatch_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_consignment ON public.courier_shipments (consignment_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON public.courier_shipments (tracking_code);

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

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);

CREATE TABLE IF NOT EXISTS public.guest_tracking_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hmac TEXT NOT NULL,
    order_number TEXT NOT NULL,
    is_success BOOLEAN NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guest_rate_ip ON public.guest_tracking_rate_limits (ip_hmac, attempt_time);
CREATE INDEX IF NOT EXISTS idx_guest_rate_order ON public.guest_tracking_rate_limits (order_number, attempt_time);

-- ---------------------------------------------------------------------
-- SECTION 09: STORED FUNCTIONS — ATOMIC CHECKOUT & VALIDATION
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
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_order_id UUID;
    v_order_number TEXT;
    v_payload_hash TEXT;
    v_idemp_record public.checkout_idempotency_keys%ROWTYPE;

    v_store_open BOOLEAN;
    v_closure_notice TEXT;
    v_charge_inside NUMERIC(10, 2);
    v_charge_outside NUMERIC(10, 2);
    v_free_threshold NUMERIC(10, 2);

    v_subtotal NUMERIC(10, 2) := 0.00;
    v_delivery_charge NUMERIC(10, 2) := 0.00;
    v_discount_amount NUMERIC(10, 2) := 0.00;
    v_total NUMERIC(10, 2) := 0.00;

    v_coupon_id UUID := NULL;
    v_coupon public.coupons%ROWTYPE;

    v_agg RECORD;
    v_item RECORD;
    v_variant RECORD;

    v_unit_price NUMERIC(10, 2);
    v_cust_charge NUMERIC(10, 2);
    v_line_total NUMERIC(10, 2);

    v_clean_phone TEXT;
    v_attempt INT := 0;
BEGIN
    -- 1. Input sanitization
    v_clean_phone := regexp_replace(TRIM(p_customer_phone), '[^0-9]', '', 'g');
    IF length(v_clean_phone) = 13 AND substring(v_clean_phone FROM 1 FOR 2) = '88' THEN
        v_clean_phone := substring(v_clean_phone FROM 3);
    END IF;

    IF length(v_clean_phone) != 11 OR substring(v_clean_phone FROM 1 FOR 2) != '01' THEN
        RAISE EXCEPTION 'Invalid customer phone number. Must be a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_delivery_zone NOT IN ('inside_dhaka', 'outside_dhaka') THEN
        RAISE EXCEPTION 'Invalid delivery zone. Must be inside_dhaka or outside_dhaka'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Cart is empty. Please add items to checkout'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_idempotency_key IS NULL OR length(trim(p_idempotency_key)) = 0 THEN
        RAISE EXCEPTION 'Checkout idempotency key is required' USING ERRCODE = 'P0001';
    END IF;

    -- 2. Concurrency-Safe Idempotency Check with Advisory Lock
    PERFORM pg_advisory_xact_lock(hashtext('chk_idemp_' || p_idempotency_key));

    v_payload_hash := encode(digest(
        trim(p_customer_name) || '|' ||
        v_clean_phone || '|' ||
        trim(p_shipping_address) || '|' ||
        p_delivery_zone || '|' ||
        COALESCE(UPPER(trim(p_coupon_code)), '') || '|' ||
        COALESCE(trim(p_customer_note), '') || '|' ||
        p_items::text,
        'sha256'
    ), 'hex');

    SELECT * INTO v_idemp_record
    FROM public.checkout_idempotency_keys
    WHERE key = p_idempotency_key;

    IF FOUND THEN
        IF v_idemp_record.payload_hash != v_payload_hash THEN
            RAISE EXCEPTION 'Idempotency violation: key "%" was already used with different checkout payload', p_idempotency_key
                USING ERRCODE = 'P0002';
        END IF;

        IF v_idemp_record.status = 'completed' THEN
            SELECT o.id, o.order_number, o.total
            INTO v_order_id, v_order_number, v_total
            FROM public.orders o
            WHERE o.id = v_idemp_record.order_id;

            RETURN jsonb_build_object(
                'success', TRUE,
                'idempotent_replay', TRUE,
                'order_id', v_idemp_record.order_id,
                'order_number', v_order_number,
                'total', v_total
            );
        ELSIF v_idemp_record.status = 'started' AND v_idemp_record.expires_at > NOW() THEN
            RAISE EXCEPTION 'Concurrent checkout request in progress for key "%". Please wait a moment', p_idempotency_key
                USING ERRCODE = '40001';
        ELSE
            DELETE FROM public.checkout_idempotency_keys WHERE key = p_idempotency_key;
        END IF;
    END IF;

    INSERT INTO public.checkout_idempotency_keys (key, payload_hash, status, created_at, expires_at)
    VALUES (p_idempotency_key, v_payload_hash, 'started', NOW(), NOW() + INTERVAL '1 hour');

    -- 3. Store Open Status & Rates Lookup
    SELECT is_store_open, closure_notice, delivery_charge_inside_dhaka, delivery_charge_outside_dhaka, free_delivery_threshold
    INTO v_store_open, v_closure_notice, v_charge_inside, v_charge_outside, v_free_threshold
    FROM public.store_settings
    WHERE id = 1;

    IF NOT COALESCE(v_store_open, TRUE) THEN
        RAISE EXCEPTION 'Store is temporarily closed: %', COALESCE(v_closure_notice, 'Please try again later')
            USING ERRCODE = 'P0001';
    END IF;

    -- 4. Aggregate cart items by variant_id to defeat duplicate-item stock bypasses
    FOR v_agg IN
        SELECT x.variant_id, SUM(x.quantity) AS total_qty
        FROM jsonb_to_recordset(p_items) AS x(
            variant_id UUID, quantity INT, custom_name TEXT, custom_number TEXT
        )
        GROUP BY x.variant_id
    LOOP
        IF v_agg.total_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid total quantity for variant %', v_agg.variant_id USING ERRCODE = 'P0001';
        END IF;

        SELECT pv.*, p.name AS prod_name, p.base_price, p.discount_price, p.is_customizable, p.customization_charge, p.is_active AS prod_active
        INTO v_variant
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = v_agg.variant_id
        FOR UPDATE OF pv;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Variant % does not exist', v_agg.variant_id USING ERRCODE = 'P0001';
        END IF;

        IF NOT v_variant.is_active OR NOT v_variant.prod_active THEN
            RAISE EXCEPTION 'Product % (%) is currently unavailable', v_variant.prod_name, v_variant.size USING ERRCODE = 'P0001';
        END IF;

        IF v_variant.stock < v_agg.total_qty THEN
            RAISE EXCEPTION 'Insufficient stock for % (Size: %). Requested: %, Available: %',
                v_variant.prod_name, v_variant.size, v_agg.total_qty, v_variant.stock
                USING ERRCODE = 'P0001';
        END IF;
    END LOOP;

    -- 5. Calculate Subtotal & Validate Customization Eligibility
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        variant_id UUID, quantity INT, custom_name TEXT, custom_number TEXT
    )
    LOOP
        SELECT pv.*, p.name AS prod_name, p.base_price, p.discount_price, p.is_customizable, p.customization_charge
        INTO v_variant
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = v_item.variant_id;

        v_unit_price := COALESCE(v_variant.discount_price, v_variant.base_price);
        v_cust_charge := 0.00;

        IF (v_item.custom_name IS NOT NULL AND length(trim(v_item.custom_name)) > 0) OR
           (v_item.custom_number IS NOT NULL AND length(trim(v_item.custom_number)) > 0) THEN
            IF NOT v_variant.is_customizable THEN
                RAISE EXCEPTION 'Customization is not available for %', v_variant.prod_name USING ERRCODE = 'P0001';
            END IF;
            v_cust_charge := v_variant.customization_charge;
        END IF;

        v_line_total := (v_unit_price + v_cust_charge) * v_item.quantity;
        v_subtotal := v_subtotal + v_line_total;
    END LOOP;

    -- 6. Delivery Charge Resolution
    IF p_delivery_zone = 'inside_dhaka' THEN
        v_delivery_charge := COALESCE(v_charge_inside, 80.00);
    ELSE
        v_delivery_charge := COALESCE(v_charge_outside, 150.00);
    END IF;

    IF v_free_threshold IS NOT NULL AND v_subtotal >= v_free_threshold THEN
        v_delivery_charge := 0.00;
    END IF;

    -- 7. Atomic Coupon Reservation & Validation under ROW LOCK
    IF p_coupon_code IS NOT NULL AND length(trim(p_coupon_code)) > 0 THEN
        SELECT * INTO v_coupon
        FROM public.coupons
        WHERE code = UPPER(TRIM(p_coupon_code)) AND is_active = TRUE
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Invalid coupon code' USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.valid_from > NOW() THEN
            RAISE EXCEPTION 'Coupon is not yet active' USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.valid_until IS NOT NULL AND v_coupon.valid_until < NOW() THEN
            RAISE EXCEPTION 'Coupon has expired' USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.usage_limit IS NOT NULL AND v_coupon.used_count >= v_coupon.usage_limit THEN
            RAISE EXCEPTION 'Coupon usage limit has been reached' USING ERRCODE = 'P0001';
        END IF;

        IF v_subtotal < v_coupon.min_order_amount THEN
            RAISE EXCEPTION 'Order subtotal does not meet the minimum amount for this coupon' USING ERRCODE = 'P0001';
        END IF;

        IF v_coupon.discount_type = 'percentage' THEN
            v_discount_amount := ROUND((v_subtotal * v_coupon.discount_value / 100.00), 2);
            IF v_coupon.max_discount_amount IS NOT NULL AND v_discount_amount > v_coupon.max_discount_amount THEN
                v_discount_amount := v_coupon.max_discount_amount;
            END IF;
        ELSIF v_coupon.discount_type = 'fixed_amount' THEN
            v_discount_amount := v_coupon.discount_value;
            IF v_discount_amount > v_subtotal THEN
                v_discount_amount := v_subtotal;
            END IF;
        END IF;

        v_coupon_id := v_coupon.id;
        UPDATE public.coupons
        SET used_count = used_count + 1, updated_at = NOW()
        WHERE id = v_coupon_id;
    END IF;

    v_total := v_subtotal + v_delivery_charge - v_discount_amount;
    IF v_total < 0 THEN
        v_total := 0.00;
    END IF;

    -- 8. Unique Order Number Generation with Collision Retry Loop
    LOOP
        v_attempt := v_attempt + 1;
        v_order_number := 'EN-' || to_char(NOW(), 'YYMMDD') || '-' || lpad((floor(random() * 9000) + 1000)::text, 4, '0');
        BEGIN
            INSERT INTO public.orders (
                order_number, user_id, customer_name, customer_phone, customer_email,
                shipping_address, delivery_zone, customer_note, subtotal, delivery_charge,
                discount_amount, total, payment_method, payment_status, status,
                coupon_id, coupon_code, stock_restored, created_at, updated_at
            ) VALUES (
                v_order_number, v_user_id, trim(p_customer_name), v_clean_phone, trim(p_customer_email),
                trim(p_shipping_address), p_delivery_zone, trim(p_customer_note), v_subtotal, v_delivery_charge,
                v_discount_amount, v_total, 'COD', 'unpaid', 'pending',
                v_coupon_id, UPPER(trim(p_coupon_code)), FALSE, NOW(), NOW()
            ) RETURNING id INTO v_order_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            IF v_attempt > 5 THEN
                RAISE EXCEPTION 'Failed to generate unique order number' USING ERRCODE = 'P0001';
            END IF;
        END;
    END LOOP;

    -- 9. Insert Line Items and Decrement Variant Stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
        variant_id UUID, quantity INT, custom_name TEXT, custom_number TEXT
    )
    LOOP
        SELECT pv.*, p.name AS prod_name, p.base_price, p.discount_price, p.is_customizable, p.customization_charge
        INTO v_variant
        FROM public.product_variants pv
        JOIN public.products p ON p.id = pv.product_id
        WHERE pv.id = v_item.variant_id;

        v_unit_price := COALESCE(v_variant.discount_price, v_variant.base_price);
        v_cust_charge := 0.00;
        IF (v_item.custom_name IS NOT NULL AND length(trim(v_item.custom_name)) > 0) OR
           (v_item.custom_number IS NOT NULL AND length(trim(v_item.custom_number)) > 0) THEN
            v_cust_charge := v_variant.customization_charge;
        END IF;
        v_line_total := (v_unit_price + v_cust_charge) * v_item.quantity;

        INSERT INTO public.order_items (
            order_id, product_id, variant_id, product_name, size, color,
            unit_price, quantity, custom_name, custom_number, customization_charge, line_total
        ) VALUES (
            v_order_id, v_variant.product_id, v_variant.id, v_variant.prod_name, v_variant.size, v_variant.color,
            v_unit_price, v_item.quantity, trim(v_item.custom_name), trim(v_item.custom_number), v_cust_charge, v_line_total
        );

        UPDATE public.product_variants
        SET stock = stock - v_item.quantity, updated_at = NOW()
        WHERE id = v_variant.id;

        INSERT INTO public.inventory_movements (
            variant_id, change_type, quantity_changed, previous_stock, new_stock, reference_id, changed_by, notes
        ) VALUES (
            v_variant.id, 'order_placed', -v_item.quantity, v_variant.stock, v_variant.stock - v_item.quantity,
            v_order_number, v_user_id, 'Deducted on checkout order ' || v_order_number
        );
    END LOOP;

    -- 10. Record Initial Status History & Immutable Invoice Snapshot
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, comment)
    VALUES (v_order_id, NULL, 'pending', v_user_id, 'Order placed via Cash on Delivery');

    INSERT INTO public.invoices (order_id, invoice_number, snapshot_data, created_at)
    VALUES (
        v_order_id,
        'INV-' || v_order_number,
        jsonb_build_object(
            'order_number', v_order_number,
            'customer_name', trim(p_customer_name),
            'customer_phone', v_clean_phone,
            'shipping_address', trim(p_shipping_address),
            'subtotal', v_subtotal,
            'delivery_charge', v_delivery_charge,
            'discount_amount', v_discount_amount,
            'total', v_total,
            'items', p_items
        ),
        NOW()
    );

    INSERT INTO public.invoice_generation_queue (order_id, status, created_at, updated_at)
    VALUES (v_order_id, 'queued', NOW(), NOW());

    UPDATE public.checkout_idempotency_keys
    SET order_id = v_order_id, status = 'completed'
    WHERE key = p_idempotency_key;

    RETURN jsonb_build_object(
        'success', TRUE,
        'idempotent_replay', FALSE,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'subtotal', v_subtotal,
        'delivery_charge', v_delivery_charge,
        'discount_amount', v_discount_amount,
        'total', v_total
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 10: GUEST ORDER TRACKING WITH DUAL-LAYER RATE LIMITING
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.track_guest_order(
    p_order_number TEXT,
    p_phone TEXT,
    p_client_ip TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pepper TEXT;
    v_clean_phone TEXT;
    v_clean_order_number TEXT;
    v_ip_hmac TEXT;
    v_ip_attempts INT;
    v_order_attempts INT;
    v_order public.orders%ROWTYPE;
    v_shipment public.courier_shipments%ROWTYPE;
BEGIN
    SELECT key_value INTO v_pepper
    FROM public.system_secrets
    WHERE key_name = 'rate_limit_pepper';

    IF v_pepper IS NULL OR length(v_pepper) < 32 THEN
        RAISE EXCEPTION 'Configuration error: guest rate limiting pepper is not securely configured'
            USING ERRCODE = 'P0001';
    END IF;

    v_clean_order_number := UPPER(TRIM(p_order_number));
    v_clean_phone := regexp_replace(TRIM(p_phone), '[^0-9]', '', 'g');
    IF length(v_clean_phone) = 13 AND substring(v_clean_phone FROM 1 FOR 2) = '88' THEN
        v_clean_phone := substring(v_clean_phone FROM 3);
    END IF;

    IF p_client_ip IS NULL OR length(trim(p_client_ip)) < 7 THEN
        RAISE EXCEPTION 'Invalid client IP address' USING ERRCODE = 'P0001';
    END IF;

    v_ip_hmac := encode(hmac(trim(p_client_ip), v_pepper, 'sha256'), 'hex');

    PERFORM pg_advisory_xact_lock(hashtext('guest_tracking_' || v_ip_hmac || '_' || v_clean_order_number));

    SELECT COUNT(*) INTO v_ip_attempts
    FROM public.guest_tracking_rate_limits
    WHERE ip_hmac = v_ip_hmac
      AND attempt_time > (NOW() - INTERVAL '10 minutes');

    IF v_ip_attempts >= 10 THEN
        RAISE EXCEPTION 'Too many tracking attempts from this network. Please wait 10 minutes'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT COUNT(*) INTO v_order_attempts
    FROM public.guest_tracking_rate_limits
    WHERE order_number = v_clean_order_number
      AND is_success = FALSE
      AND attempt_time > (NOW() - INTERVAL '15 minutes');

    IF v_order_attempts >= 5 THEN
        RAISE EXCEPTION 'Too many failed tracking attempts for this order. Please try again in 15 minutes'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT * INTO v_order
    FROM public.orders
    WHERE order_number = v_clean_order_number;

    IF NOT FOUND OR v_order.customer_phone != v_clean_phone THEN
        INSERT INTO public.guest_tracking_rate_limits (ip_hmac, order_number, is_success, attempt_time)
        VALUES (v_ip_hmac, v_clean_order_number, FALSE, NOW());

        RETURN jsonb_build_object(
            'success', FALSE,
            'message', 'Order not found or phone number does not match'
        );
    END IF;

    INSERT INTO public.guest_tracking_rate_limits (ip_hmac, order_number, is_success, attempt_time)
    VALUES (v_ip_hmac, v_clean_order_number, TRUE, NOW());

    SELECT * INTO v_shipment
    FROM public.courier_shipments
    WHERE order_id = v_order.id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order', jsonb_build_object(
            'order_number', v_order.order_number,
            'status', v_order.status,
            'customer_name', v_order.customer_name,
            'courier_code', v_order.courier_code,
            'tracking_number', v_order.tracking_number,
            'created_at', v_order.created_at,
            'shipment', CASE WHEN v_shipment.id IS NOT NULL THEN jsonb_build_object(
                'consignment_id', v_shipment.consignment_id,
                'tracking_code', v_shipment.tracking_code,
                'status', v_shipment.status
            ) ELSE NULL END
        )
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 11: COURIER DISPATCH CLAIMS & WEBHOOK PROCESSOR
-- ---------------------------------------------------------------------

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
BEGIN
    IF auth.role() = 'service_role' THEN
        IF p_admin_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = p_admin_id AND role IN ('super_admin', 'order_manager')
        ) THEN
            RAISE EXCEPTION 'Unauthorized: specified admin_id is not an authorized order manager'
                USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NOT NULL THEN
        IF auth.uid() != p_admin_id OR NOT public.current_user_is_admin() THEN
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
BEGIN
    IF auth.role() = 'service_role' THEN
        IF p_admin_id IS NULL OR NOT EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = p_admin_id AND role IN ('super_admin', 'order_manager')
        ) THEN
            RAISE EXCEPTION 'Unauthorized: specified admin_id is not an authorized order manager'
                USING ERRCODE = '42501';
        END IF;
    ELSIF auth.uid() IS NOT NULL THEN
        IF auth.uid() != p_admin_id OR NOT public.current_user_is_admin() THEN
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

    IF auth.role() != 'service_role' AND auth.uid() != v_claim.claimed_by AND NOT public.current_user_is_super_admin() THEN
        RAISE EXCEPTION 'Unauthorized: cannot release another administrator active dispatch claim'
            USING ERRCODE = '42501';
    END IF;

    UPDATE public.courier_dispatch_claims
    SET status = 'failed',
        last_error = p_error_message,
        lease_expires_at = NOW()
    WHERE order_id = p_order_id AND claim_token = p_claim_token;
END;
$$;

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
BEGIN
    IF auth.role() != 'service_role' THEN
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

    -- Out-of-order protection: terminal delivered order cannot be reverted to earlier statuses
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
-- SECTION 12: INVOICE GENERATION QUEUE HELPERS (FOR WORKER)
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
BEGIN
    IF auth.role() != 'service_role' THEN
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
BEGIN
    IF auth.role() != 'service_role' THEN
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
    SET pdf_url = trim(p_pdf_url)
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
BEGIN
    IF auth.role() != 'service_role' THEN
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
-- SECTION 13: AUTOMATIC PROFILE CREATION & SUPER ADMIN BOOTSTRAP
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, phone, email, avatar_url, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'Customer'),
        COALESCE(NEW.raw_user_meta_data ->> 'phone', ''),
        NEW.email,
        NEW.raw_user_meta_data ->> 'avatar_url',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();

    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, 'customer', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auth_user_signup ON auth.users;
CREATE TRIGGER trg_auth_user_signup
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

CREATE OR REPLACE PROCEDURE public.bootstrap_super_admin(
    p_admin_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    IF auth.role() != 'service_role' AND (auth.uid() IS NULL OR NOT public.current_user_is_super_admin()) THEN
        RAISE EXCEPTION 'Privilege escalation rejected: only superuser or service_role can bootstrap super_admin'
            USING ERRCODE = '42501';
    END IF;

    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = LOWER(TRIM(p_admin_email));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User with email % does not exist in auth.users. User must sign up first', p_admin_email
            USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'super_admin', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.routine_security_cleanup()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_deleted_rate_limits INT := 0;
    v_deleted_idemp INT := 0;
BEGIN
    IF auth.role() != 'service_role' AND (auth.uid() IS NULL OR NOT public.current_user_is_super_admin()) THEN
        RAISE EXCEPTION 'Unauthorized: only service_role or super_admin can run routine security cleanup'
            USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.guest_tracking_rate_limits
    WHERE attempt_time < (NOW() - INTERVAL '48 hours');
    GET DIAGNOSTICS v_deleted_rate_limits = ROW_COUNT;

    DELETE FROM public.checkout_idempotency_keys
    WHERE expires_at < NOW() AND status != 'started';
    GET DIAGNOSTICS v_deleted_idemp = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_rate_limits', v_deleted_rate_limits,
        'deleted_idempotency_keys', v_deleted_idemp,
        'executed_at', NOW()
    );
END;
$$;

-- ---------------------------------------------------------------------
-- SECTION 14: SQL GRANTS & PRIVILEGES
-- ---------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT SELECT ON public.public_product_variants TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT SELECT ON public.theme_customizations TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_status_history TO authenticated;
GRANT SELECT ON public.invoices TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;

GRANT ALL ON public.categories TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.product_images TO authenticated;
GRANT ALL ON public.product_variants TO authenticated;
GRANT ALL ON public.banners TO authenticated;
GRANT ALL ON public.homepage_sections TO authenticated;
GRANT ALL ON public.store_settings TO authenticated;
GRANT ALL ON public.theme_customizations TO authenticated;
GRANT ALL ON public.coupons TO authenticated;
GRANT ALL ON public.couriers TO authenticated;
GRANT ALL ON public.courier_shipments TO authenticated;
GRANT ALL ON public.courier_dispatch_claims TO authenticated;
GRANT ALL ON public.orders TO authenticated;
GRANT ALL ON public.order_items TO authenticated;
GRANT ALL ON public.order_status_history TO authenticated;
GRANT ALL ON public.invoices TO authenticated;
GRANT ALL ON public.inventory_movements TO authenticated;
GRANT ALL ON public.admin_activity_logs TO authenticated;
GRANT ALL ON public.user_roles TO authenticated;
GRANT ALL ON public.notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.place_order_atomic TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_guest_order TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_order_for_dispatch TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_dispatch TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.release_order_dispatch_claim TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.process_steadfast_webhook TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_invoice_queue_jobs TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_invoice_queue_job TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_invoice_queue_job TO service_role;
GRANT EXECUTE ON FUNCTION public.routine_security_cleanup TO service_role;

-- ---------------------------------------------------------------------
-- SECTION 15: ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT USING (auth.uid() = id OR public.current_user_is_admin());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
CREATE POLICY "user_roles_select" ON public.user_roles
FOR SELECT USING (auth.uid() = user_id OR public.current_user_is_super_admin());

DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
CREATE POLICY "user_roles_admin_manage" ON public.user_roles
FOR ALL USING (public.current_user_is_super_admin());

DROP POLICY IF EXISTS "activity_logs_select" ON public.admin_activity_logs;
CREATE POLICY "activity_logs_select" ON public.admin_activity_logs
FOR SELECT USING (public.current_user_is_super_admin());

DROP POLICY IF EXISTS "categories_public_select" ON public.categories;
CREATE POLICY "categories_public_select" ON public.categories
FOR SELECT USING (is_active = TRUE OR public.current_user_is_admin());

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "products_public_select" ON public.products;
CREATE POLICY "products_public_select" ON public.products
FOR SELECT USING (is_active = TRUE OR public.current_user_is_admin());

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "product_images_public_select" ON public.product_images;
CREATE POLICY "product_images_public_select" ON public.product_images
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "product_images_admin_all" ON public.product_images;
CREATE POLICY "product_images_admin_all" ON public.product_images
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "variants_admin_all" ON public.product_variants;
CREATE POLICY "variants_admin_all" ON public.product_variants
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "inventory_movements_admin_select" ON public.inventory_movements;
CREATE POLICY "inventory_movements_admin_select" ON public.inventory_movements
FOR SELECT USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "store_settings_public_select" ON public.store_settings;
CREATE POLICY "store_settings_public_select" ON public.store_settings
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "store_settings_admin_all" ON public.store_settings;
CREATE POLICY "store_settings_admin_all" ON public.store_settings
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "theme_public_select" ON public.theme_customizations;
CREATE POLICY "theme_public_select" ON public.theme_customizations
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "theme_admin_all" ON public.theme_customizations;
CREATE POLICY "theme_admin_all" ON public.theme_customizations
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "banners_public_select" ON public.banners;
CREATE POLICY "banners_public_select" ON public.banners
FOR SELECT USING (is_active = TRUE OR public.current_user_is_admin());

DROP POLICY IF EXISTS "banners_admin_all" ON public.banners;
CREATE POLICY "banners_admin_all" ON public.banners
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "sections_public_select" ON public.homepage_sections;
CREATE POLICY "sections_public_select" ON public.homepage_sections
FOR SELECT USING (is_active = TRUE OR public.current_user_is_admin());

DROP POLICY IF EXISTS "sections_admin_all" ON public.homepage_sections;
CREATE POLICY "sections_admin_all" ON public.homepage_sections
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "coupons_admin_all" ON public.coupons;
CREATE POLICY "coupons_admin_all" ON public.coupons
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "addresses_owner_all" ON public.customer_addresses;
CREATE POLICY "addresses_owner_all" ON public.customer_addresses
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "addresses_admin_select" ON public.customer_addresses;
CREATE POLICY "addresses_admin_select" ON public.customer_addresses
FOR SELECT USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "orders_select_own" ON public.orders;
CREATE POLICY "orders_select_own" ON public.orders
FOR SELECT USING (auth.uid() = user_id OR public.current_user_is_admin());

DROP POLICY IF EXISTS "orders_admin_update" ON public.orders;
CREATE POLICY "orders_admin_update" ON public.orders
FOR UPDATE USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "order_items_select" ON public.order_items;
CREATE POLICY "order_items_select" ON public.order_items
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_items.order_id
          AND (o.user_id = auth.uid() OR public.current_user_is_admin())
    )
);

DROP POLICY IF EXISTS "status_history_select" ON public.order_status_history;
CREATE POLICY "status_history_select" ON public.order_status_history
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_status_history.order_id
          AND (o.user_id = auth.uid() OR public.current_user_is_admin())
    )
);

DROP POLICY IF EXISTS "invoices_select" ON public.invoices;
CREATE POLICY "invoices_select" ON public.invoices
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = invoices.order_id
          AND (o.user_id = auth.uid() OR public.current_user_is_admin())
    )
);

DROP POLICY IF EXISTS "couriers_select" ON public.couriers;
CREATE POLICY "couriers_select" ON public.couriers
FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "couriers_admin_all" ON public.couriers;
CREATE POLICY "couriers_admin_all" ON public.couriers
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "shipments_select" ON public.courier_shipments;
CREATE POLICY "shipments_select" ON public.courier_shipments
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = courier_shipments.order_id
          AND (o.user_id = auth.uid() OR public.current_user_is_admin())
    )
);

DROP POLICY IF EXISTS "shipments_admin_all" ON public.courier_shipments;
CREATE POLICY "shipments_admin_all" ON public.courier_shipments
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "dispatch_claims_admin_all" ON public.courier_dispatch_claims;
CREATE POLICY "dispatch_claims_admin_all" ON public.courier_dispatch_claims
FOR ALL USING (public.current_user_is_admin());

DROP POLICY IF EXISTS "notifications_owner_all" ON public.notifications;
CREATE POLICY "notifications_owner_all" ON public.notifications
FOR ALL USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- SECTION 16: SUPABASE STORAGE BUCKETS & RLS
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('banner-images', 'banner-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('avatar-images', 'avatar-images', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('site-assets', 'site-assets', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf', 'text/html'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "storage_public_read_products" ON storage.objects;
CREATE POLICY "storage_public_read_products" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "storage_public_read_banners" ON storage.objects;
CREATE POLICY "storage_public_read_banners" ON storage.objects
FOR SELECT USING (bucket_id = 'banner-images');

DROP POLICY IF EXISTS "storage_public_read_avatars" ON storage.objects;
CREATE POLICY "storage_public_read_avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatar-images');

DROP POLICY IF EXISTS "storage_public_read_site" ON storage.objects;
CREATE POLICY "storage_public_read_site" ON storage.objects
FOR SELECT USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "storage_admin_manage_products" ON storage.objects;
CREATE POLICY "storage_admin_manage_products" ON storage.objects
FOR ALL USING (bucket_id = 'product-images' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "storage_admin_manage_banners" ON storage.objects;
CREATE POLICY "storage_admin_manage_banners" ON storage.objects
FOR ALL USING (bucket_id = 'banner-images' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "storage_admin_manage_site" ON storage.objects;
CREATE POLICY "storage_admin_manage_site" ON storage.objects
FOR ALL USING (bucket_id = 'site-assets' AND public.current_user_is_admin());

DROP POLICY IF EXISTS "storage_avatar_user_insert" ON storage.objects;
CREATE POLICY "storage_avatar_user_insert" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatar-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_invoices_access" ON storage.objects;
CREATE POLICY "storage_invoices_access" ON storage.objects
FOR SELECT USING (
    bucket_id = 'invoices' AND (
        public.current_user_is_admin() OR
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.order_number = (storage.foldername(name))[1] AND o.user_id = auth.uid()
        )
    )
);

DROP POLICY IF EXISTS "storage_invoices_admin_manage" ON storage.objects;
CREATE POLICY "storage_invoices_admin_manage" ON storage.objects
FOR ALL USING (bucket_id = 'invoices' AND (public.current_user_is_admin() OR auth.role() = 'service_role'));

-- ---------------------------------------------------------------------
-- SECTION 17: PRODUCTION BOOTSTRAP INITIAL DATA (ZERO DEMO RECORDS)
-- ---------------------------------------------------------------------

INSERT INTO public.couriers (code, name, is_active)
VALUES
    ('steadfast', 'Steadfast Courier Bangladesh', TRUE),
    ('manual', 'Store Internal Delivery', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.store_settings (
    id, store_name, store_email, store_phone,
    delivery_charge_inside_dhaka, delivery_charge_outside_dhaka,
    free_delivery_threshold, is_store_open
) VALUES (
    1, 'Eleven Nation', '', '', 80.00, 150.00, NULL, TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.theme_customizations (
    id, primary_color, accent_color,
    announcement_bar_text, announcement_bar_enabled,
    hero_headline, hero_subheadline, hero_button_text, hero_button_link
) VALUES (
    1, '#0B0F19', '#E63946', '', FALSE, '', '', '', ''
) ON CONFLICT (id) DO NOTHING;

-- Record version in schema_migrations
INSERT INTO public.schema_migrations (version, description, applied_at)
VALUES ('7.2.0', 'Eleven Nation v7.2.0 Fresh Install Complete Architecture', NOW())
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();
