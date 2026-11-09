-- =====================================================================
-- ELEVEN NATION — 002 FUNCTIONS, TRIGGERS & SECURITY AUDIT
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Atomic order function, safe restock triggers, mandatory
--              phone guest tracking, auth signup hooks & full RLS policies
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SECURITY & ROLE HELPER FUNCTIONS
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_user_id AND role IN ('super_admin', 'order_manager', 'product_manager', 'content_manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_user_id AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 2. AUTOMATED PROFILE & ROLE INITIALIZATION ON AUTH SIGNUP
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Create matching profile record
    INSERT INTO public.profiles (id, full_name, phone, email, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Valued Customer'),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        NEW.email,
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = CASE WHEN public.profiles.phone = '' THEN EXCLUDED.phone ELSE public.profiles.phone END,
        updated_at = NOW();

    -- 2. Default to customer role (Prevents self-promotion attacks)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer')
    ON CONFLICT (user_id, role) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Safe bootstrap procedure to promote primary administrator
CREATE OR REPLACE PROCEDURE bootstrap_super_admin(p_email TEXT)
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user found in auth.users with email %', p_email;
    END IF;

    INSERT INTO user_roles (user_id, role)
    VALUES (v_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'User % promoted to super_admin successfully.', p_email;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------
-- 3. SECURE ATOMIC ORDER PLACEMENT (TAMPER-PROOF PRICING & INVENTORY)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION place_order_atomic(
    p_order_number TEXT,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_email TEXT,
    p_delivery_district TEXT,
    p_delivery_area TEXT,
    p_delivery_full_address TEXT,
    p_delivery_instructions TEXT,
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
    v_delivery_charge NUMERIC(10,2) := 130.00;
    v_discount NUMERIC(10,2) := 0.00;
    v_grand_total NUMERIC(10,2) := 0.00;
    v_unit_price NUMERIC(10,2);
    v_line_total NUMERIC(10,2);
    v_custom_price NUMERIC(10,2);
    v_qty INT;
    v_inv_num TEXT;
    v_shipping_settings JSONB;
    v_free_threshold NUMERIC(10,2) := 2500.00;
    v_dhaka_fee NUMERIC(10,2) := 70.00;
    v_outside_fee NUMERIC(10,2) := 130.00;
    v_coupon RECORD;
BEGIN
    -- 0. Validate required client fields
    IF p_order_number IS NULL OR TRIM(p_order_number) = '' THEN
        RAISE EXCEPTION 'Order reference number is required.';
    END IF;
    IF p_customer_name IS NULL OR TRIM(p_customer_name) = '' THEN
        RAISE EXCEPTION 'Customer name is required.';
    END IF;
    IF p_customer_phone IS NULL OR TRIM(p_customer_phone) = '' THEN
        RAISE EXCEPTION 'Valid contact phone number is required.';
    END IF;
    IF p_delivery_district IS NULL OR TRIM(p_delivery_district) = '' THEN
        RAISE EXCEPTION 'Delivery district is required.';
    END IF;
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'Shopping bag cannot be empty.';
    END IF;

    -- 1. Create order record with provisional 0 subtotal
    INSERT INTO orders (
        order_number, user_id, customer_name, customer_phone, customer_email,
        delivery_district, delivery_area, delivery_full_address, delivery_instructions,
        subtotal, delivery_charge, discount, coupon_code, grand_total, customer_notes, status
    ) VALUES (
        p_order_number, v_user_id, p_customer_name, p_customer_phone, p_customer_email,
        p_delivery_district, p_delivery_area, p_delivery_full_address, p_delivery_instructions,
        0.00, 0.00, 0.00, p_coupon_code, 0.00, p_customer_notes, 'Pending'
    ) RETURNING id INTO v_order_id;

    -- 2. Process each item: Row-lock variant and calculate prices strictly from DB
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (v_item->>'quantity')::INT;
        IF v_qty IS NULL OR v_qty <= 0 THEN
            RAISE EXCEPTION 'Invalid item quantity: %', v_qty;
        END IF;

        -- Row lock variant to eliminate stock race conditions
        SELECT * INTO v_variant FROM product_variants
        WHERE id = (v_item->>'variantId') FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Product variant % not found in catalog.', v_item->>'variantId';
        END IF;

        IF v_variant.stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for SKU % (In stock: %, Requested: %)',
                v_variant.sku, v_variant.stock, v_qty;
        END IF;

        -- Retrieve parent product
        SELECT * INTO v_product FROM products WHERE id = v_variant.product_id;

        -- Authoritative customization pricing
        v_custom_price := 0.00;
        IF (v_item->>'customName') IS NOT NULL AND TRIM(v_item->>'customName') <> '' THEN
            IF v_product.jersey_allow_customization THEN
                v_custom_price := v_product.jersey_customization_price;
            END IF;
        END IF;

        -- Unit price calculated strictly from database
        v_unit_price := v_product.base_price + v_variant.price_modifier + v_custom_price;
        v_line_total := v_unit_price * v_qty;
        v_subtotal := v_subtotal + v_line_total;
        v_customization_total := v_customization_total + (v_custom_price * v_qty);

        -- Insert immutable line item snapshot
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

        -- Atomically decrement inventory
        UPDATE product_variants
        SET stock = stock - v_qty
        WHERE id = v_variant.id;

        -- Record inventory audit trail
        INSERT INTO inventory_movements (
            variant_id, order_id, quantity_change, movement_type, reference_note
        ) VALUES (
            v_variant.id, v_order_id, -v_qty, 'order_placed',
            'Order ' || p_order_number || ' placed via Cash on Delivery'
        );
    END LOOP;

    -- 3. Authoritative delivery charge calculation from site_settings
    SELECT value INTO v_shipping_settings FROM site_settings WHERE key = 'shipping_fees';
    IF v_shipping_settings IS NOT NULL THEN
        v_free_threshold := COALESCE((v_shipping_settings->>'free_shipping_threshold')::NUMERIC, 2500.00);
        v_dhaka_fee := COALESCE((v_shipping_settings->>'dhaka_delivery_fee')::NUMERIC, 70.00);
        v_outside_fee := COALESCE((v_shipping_settings->>'outside_dhaka_delivery_fee')::NUMERIC, 130.00);
    END IF;

    IF v_subtotal >= v_free_threshold THEN
        v_delivery_charge := 0.00;
    ELSIF LOWER(p_delivery_district) LIKE '%dhaka%' THEN
        v_delivery_charge := v_dhaka_fee;
    ELSE
        v_delivery_charge := v_outside_fee;
    END IF;

    -- 4. Authoritative discount calculation from coupons table
    v_discount := 0.00;
    IF p_coupon_code IS NOT NULL AND TRIM(p_coupon_code) <> '' THEN
        SELECT * INTO v_coupon FROM coupons
        WHERE UPPER(code) = UPPER(TRIM(p_coupon_code))
          AND is_active = TRUE
          AND (expires_at IS NULL OR expires_at > NOW())
        FOR UPDATE;

        IF FOUND THEN
            IF v_subtotal >= v_coupon.min_order_amount THEN
                IF v_coupon.usage_limit IS NULL OR v_coupon.times_used < v_coupon.usage_limit THEN
                    IF v_coupon.discount_type = 'percentage' THEN
                        v_discount := ROUND((v_subtotal * v_coupon.discount_value / 100), 2);
                        IF v_coupon.max_discount_amount IS NOT NULL THEN
                            v_discount := LEAST(v_discount, v_coupon.max_discount_amount);
                        END IF;
                    ELSE
                        v_discount := LEAST(v_subtotal, v_coupon.discount_value);
                    END IF;

                    UPDATE coupons SET times_used = times_used + 1 WHERE id = v_coupon.id;
                END IF;
            END IF;
        END IF;
    END IF;

    -- 5. Calculate final grand total & update order
    v_grand_total := GREATEST(0.00, v_subtotal + v_delivery_charge - v_discount);

    UPDATE orders
    SET subtotal = v_subtotal,
        delivery_charge = v_delivery_charge,
        discount = v_discount,
        grand_total = v_grand_total
    WHERE id = v_order_id;

    -- 6. Record initial status history step
    INSERT INTO order_status_history (
        order_id, previous_status, new_status, comment
    ) VALUES (
        v_order_id, NULL, 'Pending', 'Order placed via Cash on Delivery verification queue.'
    );

    -- 7. Generate matching official invoice record
    v_inv_num := REPLACE(p_order_number, 'EN-', 'EN-INV-');
    INSERT INTO invoices (
        invoice_number, order_id, issue_date, subtotal, customization_total,
        delivery_charge, discount, grand_total
    ) VALUES (
        v_inv_num, v_order_id, CURRENT_DATE, v_subtotal, v_customization_total,
        v_delivery_charge, v_discount, v_grand_total
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'order_number', p_order_number,
        'invoice_number', v_inv_num,
        'subtotal', v_subtotal,
        'delivery_charge', v_delivery_charge,
        'discount', v_discount,
        'grand_total', v_grand_total
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 4. CANCELLATION RESTOCK SAFEGUARD (CANNOT RESTORE MORE THAN ONCE)
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION restore_stock_on_cancellation()
RETURNS TRIGGER AS $$
DECLARE
    v_item RECORD;
BEGIN
    -- Check: status transitions to Cancelled or Returned AND stock has NOT already been restored
    IF (NEW.status IN ('Cancelled', 'Returned')) AND (NOT NEW.stock_restored) THEN
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
                'Stock restored on ' || NEW.status || ' for order ' || NEW.order_number
            );
        END LOOP;

        -- Flag stock as restored to permanently prevent duplicate replenishment
        NEW.stock_restored := TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON orders;
CREATE TRIGGER trg_restore_stock_on_cancel
BEFORE UPDATE OF status ON orders
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancellation();

-- ---------------------------------------------------------------------
-- 5. MANDATORY SECURE GUEST ORDER TRACKING
-- ---------------------------------------------------------------------

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
    -- 1. Input sanitization: Order reference is required
    IF p_order_number IS NULL OR TRIM(p_order_number) = '' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Order reference number is required.');
    END IF;

    -- 2. Security requirement: Phone number is strictly MANDATORY
    IF p_phone IS NULL OR TRIM(p_phone) = '' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Phone number verification is required to view order details.');
    END IF;

    v_clean_phone := REGEXP_REPLACE(p_phone, '[^0-9]', '', 'g');
    IF LENGTH(v_clean_phone) < 10 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Please enter a valid 10 or 11-digit Bangladesh phone number.');
    END IF;

    -- 3. Lookup order record
    SELECT * INTO v_order FROM orders
    WHERE UPPER(TRIM(order_number)) = UPPER(TRIM(p_order_number));

    IF NOT FOUND THEN
        -- Generic error to prevent enumeration
        RETURN jsonb_build_object('success', FALSE, 'error', 'No order found with the provided reference number and contact number.');
    END IF;

    -- 4. Mandatory phone matching (compares last 10 digits to normalize 01X vs +8801X)
    v_order_phone := REGEXP_REPLACE(v_order.customer_phone, '[^0-9]', '', 'g');
    IF RIGHT(v_order_phone, 10) <> RIGHT(v_clean_phone, 10) THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'No order found with the provided reference number and contact number.');
    END IF;

    -- 5. Aggregate order line items
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', i.id,
            'productId', i.product_id,
            'productName', i.product_name,
            'productImage', i.product_image,
            'size', i.size,
            'color', i.color,
            'variantSku', i.variant_sku,
            'customName', i.custom_name,
            'customNumber', i.custom_number,
            'unitPrice', i.unit_price,
            'quantity', i.quantity,
            'totalPrice', i.total_price
        )
    ) INTO v_items FROM order_items i WHERE i.order_id = v_order.id;

    -- 6. Aggregate timeline progression
    SELECT jsonb_agg(
        jsonb_build_object(
            'status', h.new_status,
            'label', h.new_status,
            'timestamp', to_char(h.created_at, 'Mon DD, YYYY HH24:MI'),
            'description', COALESCE(h.comment, 'Status update'),
            'completed', TRUE,
            'current', (h.new_status = v_order.status)
        ) ORDER BY h.created_at ASC
    ) INTO v_timeline FROM order_status_history h WHERE h.order_id = v_order.id;

    -- 7. Courier shipment status (consignment details)
    SELECT jsonb_build_object(
        'provider', cp.name,
        'consignmentId', cs.consignment_id,
        'trackingCode', cs.tracking_code,
        'trackingUrl', cs.tracking_url,
        'deliveryStatus', cs.delivery_status,
        'dispatchedAt', cs.dispatched_at
    ) INTO v_courier
    FROM courier_shipments cs
    JOIN courier_providers cp ON cp.id = cs.courier_provider_id
    WHERE cs.order_id = v_order.id
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', TRUE,
        'order', jsonb_build_object(
            'id', v_order.id,
            'orderNumber', v_order.order_number,
            'customerName', v_order.customer_name,
            'customerPhone', v_order.customer_phone,
            'deliveryAddress', jsonb_build_object(
                'district', v_order.delivery_district,
                'area', v_order.delivery_area,
                'fullAddress', v_order.delivery_full_address,
                'instructions', v_order.delivery_instructions
            ),
            'subtotal', v_order.subtotal,
            'deliveryCharge', v_order.delivery_charge,
            'discount', v_order.discount,
            'grandTotal', v_order.grand_total,
            'paymentMethod', v_order.payment_method,
            'status', v_order.status,
            'createdAt', v_order.created_at
        ),
        'items', COALESCE(v_items, '[]'::jsonb),
        'timeline', COALESCE(v_timeline, '[]'::jsonb),
        'courier', v_courier
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------
-- 6. COMPLETE ROW LEVEL SECURITY (RLS) POLICIES
-- ---------------------------------------------------------------------

-- Enable RLS across every single table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE courier_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "profiles_select_owner_or_admin" ON profiles;
CREATE POLICY "profiles_select_owner_or_admin" ON profiles FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "profiles_update_owner_or_admin" ON profiles;
CREATE POLICY "profiles_update_owner_or_admin" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin(auth.uid()));

-- 2. User Roles (Non-admins can only view their own role; only super admins can manage)
DROP POLICY IF EXISTS "user_roles_select_self" ON user_roles;
CREATE POLICY "user_roles_select_self" ON user_roles FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "user_roles_admin_manage" ON user_roles;
CREATE POLICY "user_roles_admin_manage" ON user_roles FOR ALL USING (is_super_admin(auth.uid()));

-- 3. Admin Activity Logs (Strictly admin only)
DROP POLICY IF EXISTS "admin_logs_select" ON admin_activity_logs;
CREATE POLICY "admin_logs_select" ON admin_activity_logs FOR SELECT USING (is_admin(auth.uid()));
DROP POLICY IF EXISTS "admin_logs_insert" ON admin_activity_logs;
CREATE POLICY "admin_logs_insert" ON admin_activity_logs FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- 4. Categories, Products, Images, Variants
DROP POLICY IF EXISTS "categories_public_read" ON categories;
CREATE POLICY "categories_public_read" ON categories FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "categories_admin_manage" ON categories;
CREATE POLICY "categories_admin_manage" ON categories FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "products_public_read" ON products;
CREATE POLICY "products_public_read" ON products FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "products_admin_manage" ON products;
CREATE POLICY "products_admin_manage" ON products FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_images_public_read" ON product_images;
CREATE POLICY "product_images_public_read" ON product_images FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "product_images_admin_manage" ON product_images;
CREATE POLICY "product_images_admin_manage" ON product_images FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "product_variants_public_read" ON product_variants;
CREATE POLICY "product_variants_public_read" ON product_variants FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "product_variants_admin_manage" ON product_variants;
CREATE POLICY "product_variants_admin_manage" ON product_variants FOR ALL USING (is_admin(auth.uid()));

-- 5. Customer Addresses
DROP POLICY IF EXISTS "addresses_owner_manage" ON addresses;
CREATE POLICY "addresses_owner_manage" ON addresses FOR ALL USING (auth.uid() = user_id OR is_admin(auth.uid()));

-- 6. Orders & Order Items (Direct select restricted to owner; guest access via track_guest_order)
DROP POLICY IF EXISTS "orders_select_owner_or_admin" ON orders;
CREATE POLICY "orders_select_owner_or_admin" ON orders FOR SELECT USING ((auth.uid() IS NOT NULL AND auth.uid() = user_id) OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "orders_admin_manage" ON orders;
CREATE POLICY "orders_admin_manage" ON orders FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "order_items_select_owner_or_admin" ON order_items;
CREATE POLICY "order_items_select_owner_or_admin" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND ((auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "order_items_admin_manage" ON order_items;
CREATE POLICY "order_items_admin_manage" ON order_items FOR ALL USING (is_admin(auth.uid()));

-- 7. Order Status History
DROP POLICY IF EXISTS "order_history_select_owner_or_admin" ON order_status_history;
CREATE POLICY "order_history_select_owner_or_admin" ON order_status_history FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_status_history.order_id AND ((auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "order_history_admin_manage" ON order_status_history;
CREATE POLICY "order_history_admin_manage" ON order_status_history FOR ALL USING (is_admin(auth.uid()));

-- 8. Courier Providers & Credentials
-- Providers directory is public, but credentials are strictly admin only!
DROP POLICY IF EXISTS "courier_providers_public_read" ON courier_providers;
CREATE POLICY "courier_providers_public_read" ON courier_providers FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "courier_providers_admin_manage" ON courier_providers;
CREATE POLICY "courier_providers_admin_manage" ON courier_providers FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "courier_credentials_admin_only" ON courier_credentials;
CREATE POLICY "courier_credentials_admin_only" ON courier_credentials FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "courier_shipments_select_owner_or_admin" ON courier_shipments;
CREATE POLICY "courier_shipments_select_owner_or_admin" ON courier_shipments FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = courier_shipments.order_id AND ((auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "courier_shipments_admin_manage" ON courier_shipments;
CREATE POLICY "courier_shipments_admin_manage" ON courier_shipments FOR ALL USING (is_admin(auth.uid()));

-- 9. Invoices
DROP POLICY IF EXISTS "invoices_select_owner_or_admin" ON invoices;
CREATE POLICY "invoices_select_owner_or_admin" ON invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND ((auth.uid() IS NOT NULL AND orders.user_id = auth.uid()) OR is_admin(auth.uid())))
);
DROP POLICY IF EXISTS "invoices_admin_manage" ON invoices;
CREATE POLICY "invoices_admin_manage" ON invoices FOR ALL USING (is_admin(auth.uid()));

-- 10. Inventory Movements (Strictly admin only)
DROP POLICY IF EXISTS "inventory_admin_only" ON inventory_movements;
CREATE POLICY "inventory_admin_only" ON inventory_movements FOR ALL USING (is_admin(auth.uid()));

-- 11. Customer Notifications
DROP POLICY IF EXISTS "notifications_select_owner" ON notifications;
CREATE POLICY "notifications_select_owner" ON notifications FOR SELECT USING (auth.uid() = user_id OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "notifications_update_owner" ON notifications;
CREATE POLICY "notifications_update_owner" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_admin_manage" ON notifications;
CREATE POLICY "notifications_admin_manage" ON notifications FOR ALL USING (is_admin(auth.uid()));

-- 12. Website Theme, Banners, Sections, Navigation & Settings
DROP POLICY IF EXISTS "theme_public_read" ON website_theme;
CREATE POLICY "theme_public_read" ON website_theme FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "theme_admin_manage" ON website_theme;
CREATE POLICY "theme_admin_manage" ON website_theme FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "banners_public_read" ON banners;
CREATE POLICY "banners_public_read" ON banners FOR SELECT USING (
    (is_active = TRUE AND (start_at IS NULL OR start_at <= NOW()) AND (end_at IS NULL OR end_at >= NOW()))
    OR is_admin(auth.uid())
);
DROP POLICY IF EXISTS "banners_admin_manage" ON banners;
CREATE POLICY "banners_admin_manage" ON banners FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "homepage_sections_public_read" ON homepage_sections;
CREATE POLICY "homepage_sections_public_read" ON homepage_sections FOR SELECT USING (is_visible = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "homepage_sections_admin_manage" ON homepage_sections;
CREATE POLICY "homepage_sections_admin_manage" ON homepage_sections FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "navigation_public_read" ON navigation_items;
CREATE POLICY "navigation_public_read" ON navigation_items FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "navigation_admin_manage" ON navigation_items;
CREATE POLICY "navigation_admin_manage" ON navigation_items FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "coupons_public_read" ON coupons;
CREATE POLICY "coupons_public_read" ON coupons FOR SELECT USING (is_active = TRUE OR is_admin(auth.uid()));
DROP POLICY IF EXISTS "coupons_admin_manage" ON coupons;
CREATE POLICY "coupons_admin_manage" ON coupons FOR ALL USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "site_settings_admin_manage" ON site_settings;
CREATE POLICY "site_settings_admin_manage" ON site_settings FOR ALL USING (is_admin(auth.uid()));
