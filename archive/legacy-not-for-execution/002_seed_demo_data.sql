-- =====================================================================
-- ELEVEN NATION — SEED DEMO DATA
-- Version: 1.0.0
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Realistic initial data for categories, products, banners & settings
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CATEGORIES
-- ---------------------------------------------------------------------

INSERT INTO categories (id, name, slug, description, image_url, item_count, sort_order, is_active)
VALUES
('casual', 'Casual Clothing', 'casual', 'Everyday heavyweight essentials engineered for fit, form, and effortless street aesthetics.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 14, 1, TRUE),
('jerseys', 'Football Jerseys', 'jerseys', 'Wear your passion. Authentic club kits, retro legends, and national jerseys with custom name and number printing.', 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80', 18, 2, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 2. BANNERS (HERO BANNER SLIDER)
-- ---------------------------------------------------------------------

INSERT INTO banners (
    id, title, subtitle, description, desktop_image_url, mobile_image_url,
    button_text, button_link, image_alt_text,
    text_horizontal_position, text_vertical_position,
    mobile_text_horizontal_position, mobile_text_vertical_position,
    heading_color, subtitle_color, heading_size, text_max_width, text_shadow,
    overlay_opacity, image_position_desktop, image_position_mobile, transition_type,
    sort_order, is_active, badge
)
VALUES
(
    'ban-001',
    'WEAR YOUR IDENTITY.',
    'Style that speaks. Culture that connects.',
    'Elevated casual essentials and matchday heritage tailored for individuality.',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=2400&q=90',
    'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1080&q=90',
    'EXPLORE COLLECTION',
    '/shop',
    'Eleven Nation Wear Your Identity Editorial Campaign',
    'left', 'center',
    'left', 'bottom',
    '#FFFFFF', '#F3F3F0', 'xlarge', 'max-w-2xl',
    '0 2px 14px rgba(0,0,0,0.65), 0 1px 3px rgba(0,0,0,0.85)',
    0.08, 'center right', 'center 30%', 'fade',
    1, TRUE, 'NEW SEASON DROP'
),
(
    'ban-002',
    'BUILT FOR THE CULTURE.',
    'Everyday essentials. Extraordinary identity.',
    'Heavyweight 260+ GSM compact combed cotton and architectural drop-shoulder silhouettes.',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2400&q=90',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1080&q=90',
    'EXPLORE COLLECTION',
    '/casual-clothing',
    'Eleven Nation Streetwear Heavyweight Series',
    'left', 'center',
    'left', 'bottom',
    '#FFFFFF', '#F5F5F0', 'xlarge', 'max-w-xl',
    '0 2px 14px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.85)',
    0.06, 'center 35%', 'center 20%', 'fade',
    2, TRUE, 'HEAVYWEIGHT 260 GSM'
),
(
    'ban-003',
    'REPRESENT YOUR GAME.',
    'Football culture meets everyday style.',
    'Authentic club kits, retro immortals, and official custom player name and number printing.',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=2400&q=90',
    'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1080&q=90',
    'EXPLORE COLLECTION',
    '/football-jerseys',
    'Eleven Nation Football Heritage and Kits',
    'left', 'center',
    'left', 'bottom',
    '#FFFFFF', '#F0F0EE', 'xlarge', 'max-w-2xl',
    '0 2px 14px rgba(0,0,0,0.7), 0 1px 3px rgba(0,0,0,0.85)',
    0.08, 'center 45%', 'center center', 'fade',
    3, TRUE, 'MATCHDAY ISSUE & CUSTOM PRINT'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 3. PRODUCTS & VARIANTS
-- ---------------------------------------------------------------------

-- Product 1: 260 GSM Heavyweight Oversized Tee
INSERT INTO products (
    id, name, slug, sku, subtitle, description, category_id, subcategory,
    base_price, compare_at_price, discount_percentage, is_featured, is_new_arrival, is_best_seller, in_stock, is_active,
    casual_material, casual_fit, casual_gsm, tags
)
VALUES
(
    'prod-cas-01',
    '260 GSM Heavyweight Oversized Tee',
    'heavyweight-oversized-tee-black',
    'EN-TEE-260-BLK',
    'Signature Boxy Fit · Pitch Black',
    'Constructed from premium 260 GSM 100% combed compact cotton. Designed with dropped shoulders, a tight ribbed 1.25" crewneck collar, and relaxed boxy drape. Pre-shrunk and bio-washed for lasting softness and color retention.',
    'casual',
    'oversized-tees',
    1150.00,
    1390.00,
    17,
    TRUE, TRUE, TRUE, TRUE, TRUE,
    '100% Combed Compact Cotton',
    'Oversized Boxy Fit',
    260,
    ARRAY['Heavyweight', 'Oversized', 'Streetwear', 'Core Essential']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, size, color_name, color_hex, stock, sku)
VALUES
('v-cas01-s', 'prod-cas-01', 'S', 'Pitch Black', '#111111', 18, 'EN-TEE-260-BLK-S'),
('v-cas01-m', 'prod-cas-01', 'M', 'Pitch Black', '#111111', 24, 'EN-TEE-260-BLK-M'),
('v-cas01-l', 'prod-cas-01', 'L', 'Pitch Black', '#111111', 30, 'EN-TEE-260-BLK-L'),
('v-cas01-xl', 'prod-cas-01', 'XL', 'Pitch Black', '#111111', 15, 'EN-TEE-260-BLK-XL'),
('v-cas01-xxl', 'prod-cas-01', 'XXL', 'Pitch Black', '#111111', 8, 'EN-TEE-260-BLK-XXL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
VALUES
('prod-cas-01', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 'Heavyweight Oversized Tee front view', TRUE, 1),
('prod-cas-01', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1000&q=80', 'Oversized Tee texture close up', FALSE, 2);

-- Product 2: Real Madrid 24/25 Home Kit
INSERT INTO products (
    id, name, slug, sku, subtitle, description, category_id, subcategory,
    base_price, compare_at_price, discount_percentage, is_featured, is_new_arrival, is_best_seller, in_stock, is_active,
    jersey_team_name, jersey_season, jersey_league, jersey_type, jersey_edition,
    jersey_allow_customization, jersey_customization_price, jersey_default_players, tags
)
VALUES
(
    'prod-jer-01',
    'Real Madrid 24/25 Home Kit',
    'real-madrid-24-25-home-kit',
    'EN-JER-RM-2425',
    'Official La Liga Edition · White & Houndstooth',
    'The iconic Los Blancos 2024/25 home jersey featuring a subtle houndstooth watermark weave, bespoke gold accent stripes, and heat-pressed club crest. Crafted with advanced AEROREADY breathable jacquard fabric to keep you cool on and off the pitch. Available with official player printing or your own custom name & number.',
    'jerseys',
    'club',
    1250.00,
    1550.00,
    19,
    TRUE, TRUE, TRUE, TRUE, TRUE,
    'Real Madrid CF',
    '2024/25',
    'La Liga / UEFA Champions League',
    'Home',
    'Fan Edition',
    TRUE,
    250.00,
    '[{"name": "BELLINGHAM", "number": "5"}, {"name": "VINI JR.", "number": "7"}, {"name": "MBAPPÉ", "number": "9"}, {"name": "MODRIĆ", "number": "10"}, {"name": "VALVERDE", "number": "8"}]'::jsonb,
    ARRAY['Real Madrid', 'La Liga', 'Home Kit', 'Custom Printing', 'Fan Edition']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, size, color_name, color_hex, stock, sku)
VALUES
('v-jer01-s', 'prod-jer-01', 'S', 'Crisp White', '#FFFFFF', 12, 'EN-JER-RM24-S'),
('v-jer01-m', 'prod-jer-01', 'M', 'Crisp White', '#FFFFFF', 22, 'EN-JER-RM24-M'),
('v-jer01-l', 'prod-jer-01', 'L', 'Crisp White', '#FFFFFF', 25, 'EN-JER-RM24-L'),
('v-jer01-xl', 'prod-jer-01', 'XL', 'Crisp White', '#FFFFFF', 14, 'EN-JER-RM24-XL'),
('v-jer01-xxl', 'prod-jer-01', 'XXL', 'Crisp White', '#FFFFFF', 6, 'EN-JER-RM24-XXL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, is_primary, sort_order)
VALUES
('prod-jer-01', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80', 'Real Madrid 24/25 Home Jersey front view', TRUE, 1),
('prod-jer-01', 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1000&q=80', 'Real Madrid kit details', FALSE, 2);

-- Product 3: Argentina 3-Star World Champions Edition
INSERT INTO products (
    id, name, slug, sku, subtitle, description, category_id, subcategory,
    base_price, compare_at_price, discount_percentage, is_featured, is_new_arrival, is_best_seller, in_stock, is_active,
    jersey_team_name, jersey_season, jersey_league, jersey_type, jersey_edition,
    jersey_allow_customization, jersey_customization_price, jersey_default_players, tags
)
VALUES
(
    'prod-jer-02',
    'Argentina 3-Star World Champions Edition',
    'argentina-3-star-world-cup-champions-jersey',
    'EN-JER-ARG-3STAR',
    'Historic 3 Golden Stars · Albiceleste',
    'Celebrate football immortality with the official 3-Star Argentina kit. Features the central gold FIFA World Champions 2022 patch, iconic sky blue and white vertical stripes, and the third embroidered golden star over the AFA crest. Breathable technical polyester with authentic match fit.',
    'jerseys',
    'national',
    1350.00,
    1650.00,
    18,
    TRUE, FALSE, TRUE, TRUE, TRUE,
    'Argentina National Team',
    'World Champions Edition',
    'FIFA / CONMEBOL',
    'Home',
    'Fan Edition',
    TRUE,
    250.00,
    '[{"name": "MESSI", "number": "10"}, {"name": "DI MARÍA", "number": "11"}, {"name": "ÁLVAREZ", "number": "9"}]'::jsonb,
    ARRAY['Argentina', 'World Cup', 'Messi', 'National Team', '3 Stars']
)
ON CONFLICT (id) DO NOTHING;

-- Product 4: 400 GSM French Terry Heavyweight Hoodie
INSERT INTO products (
    id, name, slug, sku, subtitle, description, category_id, subcategory,
    base_price, compare_at_price, discount_percentage, is_featured, is_new_arrival, is_best_seller, in_stock, is_active,
    casual_material, casual_fit, casual_gsm, tags
)
VALUES
(
    'prod-cas-02',
    '400 GSM French Terry Heavyweight Hoodie',
    'eleven-nation-french-terry-hoodie',
    'EN-HD-400-CHR',
    'Double Lined Hood · Charcoal Wash',
    'Meticulously crafted from heavyweight 400 GSM French Terry loopback cotton. Features an oversized double-layered hood without drawstrings for an ultra-clean architectural look, kangaroo pocket with concealed reinforcement, and heavy 2x2 ribbed cuffs.',
    'casual',
    'hoodies',
    2450.00,
    2850.00,
    14,
    TRUE, TRUE, TRUE, TRUE, TRUE,
    '100% Cotton Heavy French Terry (400 GSM)',
    'Oversized Boxy Fit',
    400,
    ARRAY['Heavyweight', 'French Terry', 'Hoodie', 'Winter Drop', 'Streetwear']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 4. SITE SETTINGS
-- ---------------------------------------------------------------------

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
}'::jsonb, 'Global store contact information'),

('shipping_fees', '{
    "free_shipping_threshold": 2500,
    "dhaka_delivery_fee": 70,
    "outside_dhaka_delivery_fee": 130,
    "currency": "BDT",
    "currency_symbol": "৳"
}'::jsonb, 'Delivery fees and threshold for Bangladesh');

-- ---------------------------------------------------------------------
-- 5. PROMOTIONAL COUPONS
-- ---------------------------------------------------------------------

INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active)
VALUES
('ELEVEN100', 'fixed_amount', 100.00, 1500.00, TRUE),
('WELCOME10', 'percentage', 10.00, 2000.00, TRUE)
ON CONFLICT (code) DO NOTHING;
