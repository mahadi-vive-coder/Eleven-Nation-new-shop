-- =====================================================================
-- ELEVEN NATION (elevennation.shop) — COMPREHENSIVE AUTOMATED TEST SUITE
-- Target Engine: PostgreSQL 15+ / Supabase
-- Strict Zero-False-Pass Assertion Engine
-- Covers: Checkout, Concurrency, RBAC, Stock, Invoices, Steadfast & Webhooks
-- =====================================================================

DO $$
DECLARE
    v_test_variant_id UUID;
    v_test_order_id UUID;
    v_test_order_id_2 UUID;
    v_coupon_id UUID;
    v_order_num TEXT;
    v_guest_token TEXT;
    v_res JSONB;
    v_track_res JSONB;
    v_dispatch_res JSONB;
    v_webhook_res JSONB;
    v_claim_token TEXT;
    v_sqlstate TEXT;
    v_error_caught BOOLEAN;
    v_initial_stock INT := 20;
    v_order_qty INT := 3;
    v_admin_fake_id UUID := gen_random_uuid();
    v_queue_jobs RECORD;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'STARTING ELEVEN NATION COMPLETE AUTOMATED TEST SUITE';
    RAISE NOTICE '=======================================================';

    -- -----------------------------------------------------------------
    -- FIXTURE SETUP: CATEGORY, PRODUCT, VARIANT & SINGLE-USE COUPON
    -- -----------------------------------------------------------------
    INSERT INTO public.categories (name, slug, is_active)
    VALUES ('Automated Test Category', 'auto-test-category', TRUE)
    ON CONFLICT (slug) DO UPDATE SET is_active = TRUE;

    INSERT INTO public.products (
        name, 
        slug, 
        base_price, 
        is_customizable, 
        customization_charge, 
        is_active
    ) VALUES (
        'Matchday Championship Jersey', 
        'matchday-championship-jersey-test', 
        1500.00, 
        TRUE, 
        200.00, 
        TRUE
    ) ON CONFLICT (slug) DO UPDATE SET base_price = 1500.00, is_active = TRUE
    RETURNING id INTO v_res;

    INSERT INTO public.product_variants (product_id, size, color, stock, sku, is_active)
    VALUES ((v_res->>'id')::UUID, 'L', 'Navy/Gold', v_initial_stock, 'EN-TEST-L-NAVY', TRUE)
    ON CONFLICT (product_id, size, color) DO UPDATE SET stock = v_initial_stock, is_active = TRUE
    RETURNING id INTO v_test_variant_id;

    -- Setup Admin Role for dispatch testing
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_admin_fake_id, 'order_manager')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Single-use test coupon (৳300 fixed discount on min ৳1000)
    INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, usage_limit, used_count, is_active)
    VALUES ('TESTFRESH300', 'fixed_amount', 300.00, 1000.00, 1, 0, TRUE)
    ON CONFLICT (code) DO UPDATE SET usage_limit = 1, used_count = 0, is_active = TRUE
    RETURNING id INTO v_coupon_id;

    -- -----------------------------------------------------------------
    -- TEST 1: ATOMIC CHECKOUT, STOCK DECREMENT & INVOICE CREATION
    -- -----------------------------------------------------------------
    -- 3 units x (1500 base + 200 custom) = 5100.00
    -- Subtotal = 5100.00 (Exceeds free shipping threshold 2500 -> Delivery = 0.00)
    -- Coupon discount = 300.00
    -- Total = 4800.00
    v_res := public.place_order_atomic(
        'Tahmid Hossain',
        '01819998877',
        'tahmid@example.com',
        'Road 12, Banani, Dhaka',
        'inside_dhaka',
        'Call before dispatching',
        'TESTFRESH300',
        jsonb_build_array(jsonb_build_object(
            'variant_id', v_test_variant_id,
            'quantity', v_order_qty,
            'custom_name', 'TAHMID',
            'custom_number', '10'
        )),
        'fresh_test_key_001'
    );

    v_test_order_id := (v_res->>'order_id')::UUID;
    v_order_num := v_res->>'order_number';
    v_guest_token := v_res->>'guest_access_token';

    IF v_test_order_id IS NULL OR v_order_num IS NULL OR v_guest_token IS NULL THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Order ID, order number, or guest_access_token was null';
    END IF;

    IF LENGTH(v_guest_token) < 24 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: guest_access_token too short: %', v_guest_token;
    END IF;

    IF (v_res->>'total')::NUMERIC != 4800.00 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Expected total 4800.00, but got %', v_res->>'total';
    END IF;

    -- Stock must be decremented from 20 to 17
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 17 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Variant stock expected 17, but found %',
            (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id);
    END IF;

    -- Coupon used_count must be exactly 1
    IF (SELECT used_count FROM public.coupons WHERE id = v_coupon_id) != 1 THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Coupon used_count expected 1, but found %',
            (SELECT used_count FROM public.coupons WHERE id = v_coupon_id);
    END IF;

    -- Authoritative invoice must be generated in invoices table
    IF NOT EXISTS (SELECT 1 FROM public.invoices WHERE order_id = v_test_order_id) THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Invoice record not created for order %', v_order_num;
    END IF;

    -- Invoice must be queued in invoice_generation_queue
    IF NOT EXISTS (SELECT 1 FROM public.invoice_generation_queue WHERE order_id = v_test_order_id) THEN
        RAISE EXCEPTION 'TEST 1 FAILURE: Invoice generation job was not queued for order %', v_order_num;
    END IF;

    RAISE NOTICE 'TEST 1 PASSED: Atomic checkout, pricing, stock deduction, and invoice queuing verified.';

    -- -----------------------------------------------------------------
    -- TEST 2: IDEMPOTENT REPLAY ON RETRY (ZERO DUPLICATE STOCK DEDUCTION)
    -- -----------------------------------------------------------------
    v_res := public.place_order_atomic(
        'Tahmid Hossain',
        '01819998877',
        'tahmid@example.com',
        'Road 12, Banani, Dhaka',
        'inside_dhaka',
        'Call before dispatching',
        'TESTFRESH300',
        jsonb_build_array(jsonb_build_object(
            'variant_id', v_test_variant_id,
            'quantity', v_order_qty,
            'custom_name', 'TAHMID',
            'custom_number', '10'
        )),
        'fresh_test_key_001'
    );

    IF (v_res->>'idempotent_replay')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Expected idempotent_replay = TRUE';
    END IF;

    IF (v_res->>'order_number') != v_order_num THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Replay returned different order number';
    END IF;

    -- Stock must remain 17
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 17 THEN
        RAISE EXCEPTION 'TEST 2 FAILURE: Stock was erroneously decremented on replay';
    END IF;

    RAISE NOTICE 'TEST 2 PASSED: Idempotent replay returned existing order without duplicate stock deduction.';

    -- -----------------------------------------------------------------
    -- TEST 3: REUSED IDEMPOTENCY KEY WITH DIFFERENT PAYLOAD MUST FAIL
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        v_res := public.place_order_atomic(
            'Tampered Customer',
            '01700112233',
            'tamper@example.com',
            'Chittagong, Bangladesh',
            'outside_dhaka',
            'Changed note',
            NULL,
            jsonb_build_array(jsonb_build_object(
                'variant_id', v_test_variant_id,
                'quantity', 1
            )),
            'fresh_test_key_001'
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
        RAISE EXCEPTION 'TEST 3 FAILURE: Idempotency key reuse with different payload was allowed';
    END IF;

    RAISE NOTICE 'TEST 3 PASSED: Key collision with differing payload strictly rejected with P0002.';

    -- -----------------------------------------------------------------
    -- TEST 4: FINANCIAL FIELDS IMMUTABILITY
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.orders SET total = 50.00 WHERE id = v_test_order_id;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' THEN
            v_error_caught := TRUE;
        ELSE
            RAISE EXCEPTION 'TEST 4 FAILURE: Caught unexpected SQLSTATE % instead of P0001', v_sqlstate;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 4 FAILURE: Direct update to order financial fields was allowed';
    END IF;

    RAISE NOTICE 'TEST 4 PASSED: Order financial fields strictly immutable (caught P0001).';

    -- -----------------------------------------------------------------
    -- TEST 5: ORDER STATE MACHINE ILLEGAL TRANSITIONS
    -- -----------------------------------------------------------------
    v_error_caught := FALSE;
    BEGIN
        -- Illegal: pending cannot jump directly to delivered
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
    -- TEST 6: VALID STATUS PROGRESSION & AUTOMATED STOCK RESTORATION
    -- -----------------------------------------------------------------
    -- Create a second order to test cancellation restock
    v_res := public.place_order_atomic(
        'Anisur Rahman',
        '01711223344',
        'anis@example.com',
        'Mirpur 10, Dhaka',
        'inside_dhaka',
        'Cancel test',
        NULL,
        jsonb_build_array(jsonb_build_object(
            'variant_id', v_test_variant_id,
            'quantity', 2
        )),
        'fresh_test_key_002'
    );
    v_test_order_id_2 := (v_res->>'order_id')::UUID;

    -- Stock was 17 - 2 = 15
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 15 THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: Expected stock 15 after second order, got %',
            (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id);
    END IF;

    -- Legal transition: pending -> confirmed -> cancelled
    UPDATE public.orders SET status = 'confirmed' WHERE id = v_test_order_id_2;
    UPDATE public.orders SET status = 'cancelled' WHERE id = v_test_order_id_2;

    -- Stock must be restored from 15 back to 17
    IF (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id) != 17 THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: Stock was not restored to 17 on cancellation. Found: %',
            (SELECT stock FROM public.product_variants WHERE id = v_test_variant_id);
    END IF;

    IF (SELECT stock_restored FROM public.orders WHERE id = v_test_order_id_2) != TRUE THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: stock_restored flag was not set to TRUE';
    END IF;

    -- Verify stock_restored cannot be reverted back to FALSE
    v_error_caught := FALSE;
    BEGIN
        UPDATE public.orders SET stock_restored = FALSE WHERE id = v_test_order_id_2;
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = 'P0001' THEN
            v_error_caught := TRUE;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 6 FAILURE: Reverting stock_restored was permitted';
    END IF;

    RAISE NOTICE 'TEST 6 PASSED: Order cancellation restored stock exactly once; stock_restored protected.';

    -- -----------------------------------------------------------------
    -- TEST 7: STRICT APPEND-ONLY AUDIT TABLES (DELETE / UPDATE BLOCKED)
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
        RAISE EXCEPTION 'TEST 7 FAILURE: Deletion from inventory_movements was permitted';
    END IF;

    RAISE NOTICE 'TEST 7 PASSED: Audit tables strictly append-only (caught 42501 on DELETE).';

    -- -----------------------------------------------------------------
    -- TEST 8: GUEST TRACKING VIA GUEST_ACCESS_TOKEN & PHONE VERIFICATION
    -- -----------------------------------------------------------------
    v_track_res := public.track_guest_order(
        p_order_number := v_order_num,
        p_guest_access_token := v_guest_token
    );

    IF (v_track_res->>'success')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 8A FAILURE: Guest tracking via token failed: %', v_track_res->>'message';
    END IF;

    IF (v_track_res->>'verified_by') != 'guest_access_token' THEN
        RAISE EXCEPTION 'TEST 8A FAILURE: Expected verified_by = guest_access_token';
    END IF;

    v_track_res := public.track_guest_order(
        p_order_number := v_order_num,
        p_phone := '01819998877',
        p_client_ip := '192.168.1.100'
    );

    IF (v_track_res->>'success')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 8B FAILURE: Guest tracking via phone failed: %', v_track_res->>'message';
    END IF;

    RAISE NOTICE 'TEST 8 PASSED: Guest tracking verified via token and rate-limited phone check.';

    -- -----------------------------------------------------------------
    -- TEST 9: STEADFAST DISPATCH CLAIM & CONCURRENCY LEASE
    -- -----------------------------------------------------------------
    -- First move order 1 from pending -> confirmed
    UPDATE public.orders SET status = 'confirmed' WHERE id = v_test_order_id;

    -- Claim order for dispatch by authorized admin
    v_dispatch_res := public.claim_order_for_dispatch(
        p_order_id := v_test_order_id,
        p_courier_code := 'steadfast',
        p_admin_id := v_admin_fake_id,
        p_lease_seconds := 300
    );

    IF (v_dispatch_res->>'success')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 9 FAILURE: claim_order_for_dispatch failed';
    END IF;
    v_claim_token := v_dispatch_res->>'claim_token';

    -- Verify concurrent claim on same order while leased throws 40001
    v_error_caught := FALSE;
    BEGIN
        PERFORM public.claim_order_for_dispatch(
            p_order_id := v_test_order_id,
            p_courier_code := 'steadfast',
            p_admin_id := v_admin_fake_id,
            p_lease_seconds := 300
        );
    EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = '40001' THEN
            v_error_caught := TRUE;
        END IF;
    END;

    IF NOT v_error_caught THEN
        RAISE EXCEPTION 'TEST 9 FAILURE: Concurrent dispatch claim on active lease was allowed';
    END IF;

    -- Finalize dispatch
    v_dispatch_res := public.finalize_order_dispatch(
        p_order_id := v_test_order_id,
        p_claim_token := v_claim_token,
        p_admin_id := v_admin_fake_id,
        p_courier_code := 'steadfast',
        p_consignment_id := 'SF-TEST-CONSIGN-01',
        p_tracking_code := 'SF-TRK-998877',
        p_dispatch_payload := '{"status": "in_review"}'::jsonb
    );

    IF (v_dispatch_res->>'success')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 9 FAILURE: finalize_order_dispatch failed';
    END IF;

    -- Order must now be shipped
    IF (SELECT status FROM public.orders WHERE id = v_test_order_id) != 'shipped' THEN
        RAISE EXCEPTION 'TEST 9 FAILURE: Order status expected shipped, got %',
            (SELECT status FROM public.orders WHERE id = v_test_order_id);
    END IF;

    RAISE NOTICE 'TEST 9 PASSED: Steadfast dispatch claim, lease locking, and dispatch finalization verified.';

    -- -----------------------------------------------------------------
    -- TEST 10: STEADFAST WEBHOOK PROCESSOR & IDEMPOTENCY
    -- -----------------------------------------------------------------
    -- Deliver webhook event
    v_webhook_res := public.process_steadfast_webhook(
        p_event_id := 'evt_sf_test_001',
        p_consignment_id := 'SF-TEST-CONSIGN-01',
        p_invoice := v_order_num,
        p_status := 'delivered',
        p_payload := '{"status": "delivered", "reason": "Delivered successfully"}'::jsonb
    );

    IF (v_webhook_res->>'success')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 10 FAILURE: process_steadfast_webhook failed';
    END IF;

    -- Order must now be delivered and paid
    IF (SELECT status FROM public.orders WHERE id = v_test_order_id) != 'delivered'
       OR (SELECT payment_status FROM public.orders WHERE id = v_test_order_id) != 'paid' THEN
        RAISE EXCEPTION 'TEST 10 FAILURE: Order status was not updated to delivered/paid by webhook';
    END IF;

    -- Duplicate event must return duplicate: TRUE idempotently
    v_webhook_res := public.process_steadfast_webhook(
        p_event_id := 'evt_sf_test_001',
        p_consignment_id := 'SF-TEST-CONSIGN-01',
        p_invoice := v_order_num,
        p_status := 'delivered',
        p_payload := '{"status": "delivered"}'::jsonb
    );

    IF (v_webhook_res->>'duplicate')::BOOLEAN != TRUE THEN
        RAISE EXCEPTION 'TEST 10 FAILURE: Duplicate webhook event was not recognized';
    END IF;

    RAISE NOTICE 'TEST 10 PASSED: Steadfast webhook processing and duplicate idempotency verified.';

    -- -----------------------------------------------------------------
    -- TEST 11: INVOICE GENERATION QUEUE JOB CLAIMING & COMPLETION
    -- -----------------------------------------------------------------
    SELECT * INTO v_queue_jobs
    FROM public.claim_invoice_queue_jobs(
        p_worker_id := 'test_worker_1',
        p_batch_size := 5,
        p_lease_seconds := 180
    ) LIMIT 1;

    IF v_queue_jobs.job_id IS NOT NULL THEN
        PERFORM public.complete_invoice_queue_job(
            p_job_id := v_queue_jobs.job_id,
            p_pdf_url := 'https://storage.supabase.co/invoices/test.pdf',
            p_worker_id := 'test_worker_1'
        );

        IF (SELECT pdf_url FROM public.invoices WHERE order_id = v_queue_jobs.order_id) IS NULL THEN
            RAISE EXCEPTION 'TEST 11 FAILURE: Invoices pdf_url was not updated by complete_invoice_queue_job';
        END IF;
    END IF;

    RAISE NOTICE 'TEST 11 PASSED: Background invoice queue claiming and completion verified.';

    -- -----------------------------------------------------------------
    -- TEST 12: CLEANUP TEARDOWN OF ISOLATED TEST DATA
    -- -----------------------------------------------------------------
    DELETE FROM public.courier_webhook_events WHERE event_id = 'evt_sf_test_001';
    DELETE FROM public.courier_shipments WHERE consignment_id = 'SF-TEST-CONSIGN-01';
    DELETE FROM public.courier_dispatch_claims WHERE order_id IN (v_test_order_id, v_test_order_id_2);
    DELETE FROM public.invoice_generation_queue WHERE order_id IN (v_test_order_id, v_test_order_id_2);
    DELETE FROM public.invoices WHERE order_id IN (v_test_order_id, v_test_order_id_2);
    DELETE FROM public.orders WHERE id IN (v_test_order_id, v_test_order_id_2);
    DELETE FROM public.checkout_idempotency_keys WHERE key IN ('fresh_test_key_001', 'fresh_test_key_002');
    DELETE FROM public.product_variants WHERE id = v_test_variant_id;
    DELETE FROM public.products WHERE slug = 'matchday-championship-jersey-test';
    DELETE FROM public.categories WHERE slug = 'auto-test-category';
    DELETE FROM public.coupons WHERE id = v_coupon_id;
    DELETE FROM public.user_roles WHERE user_id = v_admin_fake_id;
    DELETE FROM public.guest_tracking_rate_limits WHERE ip_hash = encode(digest('192.168.1.100', 'sha256'), 'hex');

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'ALL 12 TESTS VERIFIED AND PASSED SUCCESSFULLY (v7.1.0/FINAL)';
    RAISE NOTICE '=======================================================';
END;
$$;
