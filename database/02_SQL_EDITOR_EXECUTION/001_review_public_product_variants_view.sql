-- ============================================================================
-- ELEVEN NATION — INCREMENTAL MIGRATION 001
-- FILE: database/02_SQL_EDITOR_EXECUTION/001_review_public_product_variants_view.sql
-- STATUS: [DO NOT RUN YET — REVIEW REQUIRED]
--
-- DESCRIPTION:
-- Architectural security review and configuration definition for the
-- public_product_variants view.
--
-- ARCHITECTURAL FINDING & ANALYSIS:
-- In PostgreSQL 15+, views support the 'security_invoker' option:
--   - security_invoker = true: RLS policies on underlying tables are checked
--     against the user querying the view (invoker).
--   - security_invoker = false (default): RLS policies on underlying tables
--     are checked against the view owner (definer).
--
-- IN ELEVEN NATION'S DATABASE:
-- 1. Base table `public.product_variants` has RLS enabled with the policy:
--    "Variants viewable by product_manager or super_admin"
--    FOR SELECT USING (current_user_has_any_role(ARRAY['product_manager', 'super_admin']));
-- 2. Regular shoppers and anonymous visitors have NO direct SELECT access to
--    `public.product_variants` to protect integer warehouse stock levels,
--    reorder thresholds, and internal supplier data from competitor scraping.
-- 3. The `public.public_product_variants` view projects:
--    id, product_id, title, price, compare_at_price, sku, color, size, material,
--    (stock > 0) AS in_stock, is_active, display_order, created_at, updated_at.
--
-- CRITICAL SAFETY WARNING:
-- If `security_invoker = true` is set on this view, any query from an anonymous
-- user or regular customer will evaluate RLS on `public.product_variants` as the
-- caller. Because neither `anon` nor regular customers satisfy the admin role check,
-- the query returns ZERO rows.
-- Setting `security_invoker = true` would immediately BREAK the storefront catalog.
--
-- RECOMMENDATION:
-- Keep `security_invoker = false` so the view functions as a controlled definer
-- abstraction, safely exposing boolean `in_stock` while concealing absolute quantities.
-- Enable `security_barrier = true` to prevent optimizer leakages via user-defined functions.
--
-- RUN INSTRUCTIONS:
-- Do NOT execute unless reviewed and approved by the lead database administrator.
-- ============================================================================

-- Transaction safety block
BEGIN;

-- Explicitly confirm the view definition with security_barrier enabled
CREATE OR REPLACE VIEW public.public_product_variants
WITH (security_barrier = true, security_invoker = false) AS
SELECT
    id,
    product_id,
    title,
    price,
    compare_at_price,
    sku,
    color,
    size,
    material,
    (stock > 0) AS in_stock,
    is_active,
    display_order,
    created_at,
    updated_at
FROM public.product_variants
WHERE is_active = true;

-- Ensure public read permissions remain intact
GRANT SELECT ON public.public_product_variants TO anon, authenticated;

COMMENT ON VIEW public.public_product_variants IS
'Secure storefront catalog view exposing boolean stock availability while hiding raw inventory counts. Runs with definer semantics to safely bypass base table restrictions for public visitors.';

COMMIT;
