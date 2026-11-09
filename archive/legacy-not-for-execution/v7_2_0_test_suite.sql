-- =====================================================================
-- ELEVEN NATION (elevennation.shop) — V7.2.0 EXECUTABLE TEST SUITE
-- Strict Zero-False-Pass Verification Suite
-- Target Engine: PostgreSQL 15+ / Supabase
-- =====================================================================

DO $$
DECLARE
    v_test_variant_id UUID;
    v_test_order_id UUID;
    v_coupon_id UUID;
    v_order_num TEXT;
    v_res JSONB;
    v_sqlstate TEXT;
    v_error_caught BOOLEAN;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'STARTING ELEVEN NATION v7.2.0 EXECUTABLE TEST SUITE';
    RAISE NOTICE '=======================================================';

    -- Step 1: Configure isolated testing pepper
    CALL configure_system_secrets('test_pepper_32_chars_minimum_strict_v720_ok');

    -- Step 2: Create isolated test product and variant
    INSERT INTO public.categories (name, slug)
    VALUES ('Testing Category', 'testing-category-v720')
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO public.products (name, slug, base_price, is_customizable, customization_charge)
    VALUES ('Championship Jersey', 'champ-jersey-v720', 1200.00, TRUE, 150.00)
    ON CONFLICT (slug) DO UPDATE SET base_price = 1200.00
    RETURNING id INTO v_res;

    INSERT INTO public.product_variants (product_id, size, color, stock)
    VALUES ((v_res->>'id')::UUID, 'XL', 'Gold', 10)
    ON CONFLICT (product_id, size, color) DO UPDATE SET stock = 10
    RETURNING id INTO v_test_variant_id;

    -- Step 3: Create single-use test coupon
    INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, usage_limit, is_active)
    VALUES ('ONCE72', 'fixed_amount', 200.00, 500.00, 1, TRUE)
    ON CONFLICT (code) DO UPDATE SET usage_limit = 1, used_count = 0
    RETURNING id INTO v_coupon_id;

    -- -----------------------------------------------------------------
    -- TEST 1: ATOMIC CHECKOUT & ACCURATE PRICING
    -- -----------------------------------------------------------------
    v_res := public.place_order_atomic(
        'Habib Rahman',
        '01711223344',
        'habib@example.com',
        'Sector 3, Uttara, Dhaka',
        'inside_dhaka',
        'Please deliver promptly',
        'ONCE72',
        jsonb_build_array(jsonb_build_object(
            'variant_id', v_test_variant_id,
            'quantity', 2,
            'custom_name', 'RONALDO',
            'custom_number', '7'
        )),
        'v720_idemp_key_01'
    );

    v_test_order_id := (v_res->>'order_id')::UUID;
    v_order_num := v_res->>'order_number';

    -- Calculation: Subtotal = (1200 + 150) * 2 = 2700; Delivery = 80; Discount = 200; Total = 2580.00
    IF (v_res->>'total')::NUMERIC != 2580.00 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Expected total 2580.00, but got %', v_res->>'total';
    END IF;

    -- Variant stock should be decremented from 10 to 8
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 8 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Variant stock expected 8, but got %',
            (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id);
    END IF;

    -- Coupon used_count should be exactly 1
    IF (SELECT used_count FROM public.coupons WHERE id = v_coupon_id) != 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Coupon used_count expected 1, but got %',
            (SELECT used_count FROM public.coupons WHERE id = v_coupon_id);
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Atomic checkout, customization charge, delivery, and stock reservation verified.';

    -- -----------------------------------------------------------------
    -- TEST 2: IDEMPOTENT REPLAY WITH IDENTICAL PAYLOAD
    -- -----------------------------------------------------------------
    v_res := public.place_order_atomic(
        'Habib Rahman',
        '01711223344',
        'habib@example.com',
        'Sector 3, Uttara, Dhaka',
        'inside_dhaka',
        'Please deliver promptly',
        'ONCE72',
        jsonb_build_array(jsonb_build_object(
            'variant_id', v_test_variant_id,
            'quantity', 2,
            'custom_name', 'RONALDO',
            'custom_number', '7'
        )),
        'v720_idemp_key_01'
    );

    IF (v_res->>'idempotent_replay')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Expected idempotent_replay = TRUE on re-submission';
    END IF;

    IF (v_res->>'order_number') != v_order_num THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Replay returned different order number';
    END IF;

    -- Stock must NOT be decremented again (must still be 8)
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 8 THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Stock was erroneously decremented on replay';
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: Idempotent replay returned existing order without duplicate stock deduction.';

    -- -----------------------------------------------------------------
    -- TEST 3: REUSED IDEMPOTENCY KEY WITH DIFFERENT PAYLOAD MUST FAIL
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        v_res := public.place_order_atomic(
            'Different Customer',
            '01799887766',
            'diff@example.com',
            'Dhanmondi, Dhaka',
            'inside_dhaka',
            '',
            NULL,
            jsonb_build_array(jsonb_build_object(
                'variant_id', v_test_variant_id,
                'quantity', 1
            )),
            'v720_idemp_key_01' -- Reusing key from Test 1 with different payload
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0002' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 3 FAILURE: Caught unexpected SQLSTATE % instead of P0002', v_sqlstate;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 3 FAILURE: Reusing idempotency key with different payload was unexpectedly allowed';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: Idempotency payload mismatch strictly rejected with P0002.';

    -- -----------------------------------------------------------------
    -- TEST 4: FINANCIAL ATTRIBUTES IMMUTABILITY TRIGGER
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.orders SET total = 10.00 WHERE id = v_test_order_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 4 FAILURE: Caught unexpected SQLSTATE % instead of P0001', v_sqlstate;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4 FAILURE: Direct update to order financial fields was unexpectedly allowed';
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: Order financial fields immutable (caught P0001).';

    -- -----------------------------------------------------------------
    -- TEST 5: STATE MACHINE ILLEGAL TRANSITIONS
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        -- pending cannot skip directly to delivered
        UPDATE public.orders SET status = 'delivered' WHERE id = v_test_order_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 5 FAILURE: Caught unexpected SQLSTATE % instead of P0001', v_sqlstate;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 5 FAILURE: Illegal status transition (pending -> delivered) was permitted';
    END IF;

    RAISE NOTICE 'TEST 5 PASSED: Illegal state transition rejected by state machine.';

    -- -----------------------------------------------------------------
    -- TEST 6: ORDER CANCELLATION RESTORES STOCK EXACTLY ONCE
    -- -----------------------------------------------------------------
    -- Legal transition: pending -> cancelled
    UPDATE public.orders SET status = 'cancelled' WHERE id = v_test_order_id;

    -- Stock was 8, order was 2 items -> stock must now be 10
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 10 THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: Stock was not restored to 10 on cancellation';
    END IF;

    IF (SELECT stock_restored FROM public.orders WHERE id = v_test_order_id) != TRUE THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: stock_restored flag was not set to TRUE';
    END IF;

    -- Verify stock_restored cannot be reverted back to FALSE
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.orders SET stock_restored = FALSE WHERE id = v_test_order_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' THEN
            v_error_caught := TRUE;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: Reverting stock_restored flag was unexpectedly permitted';
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Order cancellation restored stock exactly once; stock_restored protected.';

    -- -----------------------------------------------------------------
    -- TEST 7: STRICT APPEND-ONLY AUDIT LOG PROTECTION
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        DELETE FROM public.inventory_movements WHERE reference_id = v_order_num;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = '42501' THEN
            v_error_caught := TRUE;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 7 FAILURE: Deletion from inventory_movements was unexpectedly permitted';
    END IF;

    RAISE NOTICE 'TEST 7 PASSED: Audit tables are strictly append-only (caught 42501 on DELETE).';

    -- -----------------------------------------------------------------
    -- TEST 8: CLEANUP TEARDOWN OF ISOLATED TEST DATA
    -- -----------------------------------------------------------------
    DELETE FROM public.checkout_idempotency_keys WHERE key = 'v720_idemp_key_01';
    DELETE FROM public.invoices WHERE order_id = v_test_order_id;
    DELETE FROM public.invoice_generation_queue WHERE order_id = v_test_order_id;
    DELETE FROM public.orders WHERE id = v_test_order_id;
    DELETE FROM public.product_variants WHERE id = v_test_variant_id;
    DELETE FROM public.coupons WHERE id = v_coupon_id;

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ALL 7 TESTS VERIFIED AND PASSED SUCCESSFULLY (v7.2.0)';
    RAISE NOTICE '=======================================================';
END;
$$;
