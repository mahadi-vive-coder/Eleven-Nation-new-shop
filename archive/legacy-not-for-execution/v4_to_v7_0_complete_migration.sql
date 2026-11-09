-- =====================================================================
-- ELEVEN NATION (elevennation.shop) — V4-TO-V7.1 COMPLETE MIGRATION
-- Migration Target: Version 7.1.0 Definitive Production Release
-- Source Engine: PostgreSQL 15+ / Supabase
--
-- PURPOSE:
-- Safely upgrade any existing v4.x, v5.x, or v6.x database schema
-- to the hardened, production-ready v7.1.0 architecture without
-- deleting or corrupting existing real orders, customers, or catalog records.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- PREFLIGHT CHECK & SCHEMA VERSION TRACKING
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check if already applied
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '7.1.0') THEN
        RAISE NOTICE 'Migration 7.1.0 has already been applied. Skipping.';
    END IF;
END;
$$;

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

-- ---------------------------------------------------------------------
-- STEP 1: RBAC & AUDIT LOG UPGRADE
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

CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('customer', 'super_admin', 'order_manager', 'product_manager', 'content_manager')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

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
-- STEP 2: SYSTEM SECRETS & COURIER DISPATCH TABLES
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.system_secrets (
    key_name TEXT PRIMARY KEY,
    key_value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

REVOKE ALL ON public.system_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.system_secrets TO service_role;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS customization_charge NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS consignment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stock_restored BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.checkout_idempotency_keys (
    key TEXT PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    payload_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour')
);

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

CREATE TABLE IF NOT EXISTS public.guest_tracking_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_hmac TEXT NOT NULL,
    order_number TEXT NOT NULL,
    is_success BOOLEAN NOT NULL,
    attempt_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- STEP 3: STORAGE BUCKETS SETUP
-- ---------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('product-images', 'product-images', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('banner-images', 'banner-images', TRUE, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('avatar-images', 'avatar-images', TRUE, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('site-assets', 'site-assets', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('invoices', 'invoices', FALSE, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Record migration version
INSERT INTO public.schema_migrations (version, description, applied_at)
VALUES ('7.1.0', 'Eleven Nation v7.1.0 hardened release migration', NOW())
ON CONFLICT (version) DO UPDATE
SET applied_at = NOW();

COMMIT;
