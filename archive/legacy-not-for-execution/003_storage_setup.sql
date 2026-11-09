-- =====================================================================
-- ELEVEN NATION — 003 SUPABASE STORAGE SETUP & ACCESS POLICIES
-- Target Engine: Supabase Storage / PostgreSQL
-- Description: Provision storage buckets, MIME restrictions, size limits,
--              and complete Row Level Security (RLS) policies
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. BUCKET PROVISIONING
-- ---------------------------------------------------------------------

-- 1. Product Images Bucket (5 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    TRUE,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Hero Banner Images Bucket (10 MB limit for high-res banners)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'banner-images',
    'banner-images',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Customer Avatar Images Bucket (2 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatar-images',
    'avatar-images',
    TRUE,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 4. Site Assets Bucket (Logos, Favicons, Invoices, Receipts) (10 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'site-assets',
    'site-assets',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------
-- 2. STORAGE ROW LEVEL SECURITY POLICIES
-- ---------------------------------------------------------------------

-- Enable RLS on storage.objects if not already active
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 1. PRODUCT IMAGES POLICIES
DROP POLICY IF EXISTS "storage_product_images_select" ON storage.objects;
CREATE POLICY "storage_product_images_select" ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "storage_product_images_insert" ON storage.objects;
CREATE POLICY "storage_product_images_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'product-images' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_product_images_update" ON storage.objects;
CREATE POLICY "storage_product_images_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_product_images_delete" ON storage.objects;
CREATE POLICY "storage_product_images_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND is_admin(auth.uid()));

-- 2. BANNER IMAGES POLICIES
DROP POLICY IF EXISTS "storage_banner_images_select" ON storage.objects;
CREATE POLICY "storage_banner_images_select" ON storage.objects FOR SELECT
USING (bucket_id = 'banner-images');

DROP POLICY IF EXISTS "storage_banner_images_insert" ON storage.objects;
CREATE POLICY "storage_banner_images_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'banner-images' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_banner_images_update" ON storage.objects;
CREATE POLICY "storage_banner_images_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'banner-images' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_banner_images_delete" ON storage.objects;
CREATE POLICY "storage_banner_images_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'banner-images' AND is_admin(auth.uid()));

-- 3. AVATAR IMAGES POLICIES
DROP POLICY IF EXISTS "storage_avatar_images_select" ON storage.objects;
CREATE POLICY "storage_avatar_images_select" ON storage.objects FOR SELECT
USING (bucket_id = 'avatar-images');

DROP POLICY IF EXISTS "storage_avatar_images_insert" ON storage.objects;
CREATE POLICY "storage_avatar_images_insert" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatar-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_avatar_images_update" ON storage.objects;
CREATE POLICY "storage_avatar_images_update" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatar-images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "storage_avatar_images_delete" ON storage.objects;
CREATE POLICY "storage_avatar_images_delete" ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatar-images' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR is_admin(auth.uid()))
);

-- 4. SITE ASSETS POLICIES
DROP POLICY IF EXISTS "storage_site_assets_select" ON storage.objects;
CREATE POLICY "storage_site_assets_select" ON storage.objects FOR SELECT
USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "storage_site_assets_insert" ON storage.objects;
CREATE POLICY "storage_site_assets_insert" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'site-assets' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_site_assets_update" ON storage.objects;
CREATE POLICY "storage_site_assets_update" ON storage.objects FOR UPDATE
USING (bucket_id = 'site-assets' AND is_admin(auth.uid()));

DROP POLICY IF EXISTS "storage_site_assets_delete" ON storage.objects;
CREATE POLICY "storage_site_assets_delete" ON storage.objects FOR DELETE
USING (bucket_id = 'site-assets' AND is_admin(auth.uid()));
