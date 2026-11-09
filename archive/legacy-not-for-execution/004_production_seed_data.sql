-- =====================================================================
-- ELEVEN NATION — 004 PRODUCTION SEED DATA
-- Target Engine: PostgreSQL 15+ / Supabase
-- Description: Clean category taxonomy, courier providers, configurable
--              site settings, theme, navigation & layout sections
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. DYNAMIC CATEGORY TAXONOMY HIERARCHY
-- ---------------------------------------------------------------------

INSERT INTO categories (id, name, slug, parent_id, level, description, image_url, sort_order, is_active)
VALUES
-- Level 1: Root Collections
('clothing', 'Clothing', 'clothing', NULL, 1, 'Heavyweight metropolitan casual wear and daily essentials.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('jerseys', 'Jerseys', 'jerseys', NULL, 1, 'Authentic football matchday kits, national editions, and retro legends.', 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80', 2, TRUE),

-- Level 2: Subcategories under Jerseys
('national-teams', 'National Teams', 'national-teams', 'jerseys', 2, 'Represent your country on the world stage.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('club-teams', 'Club Teams', 'club-teams', 'jerseys', 2, 'Official European club jerseys and championship match kits.', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80', 2, TRUE),

-- Level 3: National Teams
('argentina', 'Argentina', 'argentina', 'national-teams', 3, 'Albiceleste 3-Star World Champions Edition kits.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('brazil', 'Brazil', 'brazil', 'national-teams', 3, 'Canarinho 5-Star Joga Bonito football heritage.', 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('france', 'France', 'france', 'national-teams', 3, 'Les Bleus official tournament and match editions.', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),

-- Level 3: Club Teams
('real-madrid', 'Real Madrid', 'real-madrid', 'club-teams', 3, 'Los Blancos official La Liga and UEFA Champions League kits.', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('barcelona', 'Barcelona', 'barcelona', 'club-teams', 3, 'FC Barcelona Blaugrana heritage and special anniversary kits.', 'https://images.unsplash.com/photo-1577223625816-7546f13df25d?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('manchester-united', 'Manchester United', 'manchester-united', 'club-teams', 3, 'The Red Devils Old Trafford home, away and third kits.', 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),

-- Level 2: Subcategories under Clothing
('oversized-tees', 'Oversized T-Shirts', 'oversized-tees', 'clothing', 2, '260+ GSM compact combed cotton boxy dropped shoulder silhouettes.', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=80', 1, TRUE),
('hoodies', 'Hoodies', 'hoodies', 'clothing', 2, '400 GSM French Terry heavyweight loopback cotton hoodies.', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=80', 2, TRUE),
('sweatshirts', 'Sweatshirts', 'sweatshirts', 'clothing', 2, '360 GSM brushed fleece crewnecks and garment wash patinas.', 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=1000&q=80', 3, TRUE),
('polo-shirts', 'Polo Shirts', 'polo-shirts', 'clothing', 2, '240 GSM organic piqué cotton minimalist polos with hidden plackets.', 'https://images.unsplash.com/photo-1625910513413-5a2119df43fa?auto=format&fit=crop&w=1000&q=80', 4, TRUE),
('shirts', 'Casual Shirts', 'shirts', 'clothing', 2, 'Structured poplin overshirts and everyday layering staples.', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=1000&q=80', 5, TRUE)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------
-- 2. COURIER PROVIDERS (STEADFAST INTEGRATION PRIMARY)
-- ---------------------------------------------------------------------

INSERT INTO courier_providers (id, name, code, is_active, is_default, tracking_url_template, api_endpoint_base)
VALUES
('steadfast', 'Steadfast Courier', 'STEADFAST', TRUE, TRUE, 'https://steadfast.com.bd/t/{consignment_id}', 'https://portal.steadfast.com.bd/api/v1'),
('pathao', 'Pathao Courier', 'PATHAO', TRUE, FALSE, 'https://pathao.com/courier/tracking/?consignment_id={consignment_id}', 'https://api-hermes.pathao.com/aladdin/api/v1'),
('redx', 'RedX Logistics', 'REDX', TRUE, FALSE, 'https://redx.com.bd/track-order/?trackingId={consignment_id}', 'https://openapi.redx.com.bd/v1.0.0-beta')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    tracking_url_template = EXCLUDED.tracking_url_template,
    api_endpoint_base = EXCLUDED.api_endpoint_base;

-- ---------------------------------------------------------------------
-- 3. VISUAL THEME CONFIGURATION (BRAND TOKENS)
-- ---------------------------------------------------------------------

INSERT INTO website_theme (
    id, logo_text, color_brand_bg, color_brand_text, color_brand_olive,
    color_brand_card, color_brand_border, color_brand_muted, font_display, font_body,
    announcement_text, announcement_is_active, is_active
)
VALUES (
    'default',
    'ELEVEN NATION',
    '#F5F3EE',
    '#171717',
    '#8A927A',
    '#FFFFFF',
    '#D8D4CA',
    '#77746D',
    'Manrope',
    'DM Sans',
    'Free express delivery on orders over ৳2,500 across Bangladesh · Cash on Delivery available',
    TRUE,
    TRUE
)
ON CONFLICT (id) DO UPDATE SET
    logo_text = EXCLUDED.logo_text,
    color_brand_bg = EXCLUDED.color_brand_bg,
    color_brand_text = EXCLUDED.color_brand_text,
    color_brand_olive = EXCLUDED.color_brand_olive,
    announcement_text = EXCLUDED.announcement_text;

-- ---------------------------------------------------------------------
-- 4. CONFIGURABLE SITE SETTINGS (ZERO INVENTED DUMMY DETAILS)
-- ---------------------------------------------------------------------

INSERT INTO site_settings (key, value, description)
VALUES
('store_info', '{
    "store_name": "ELEVEN NATION",
    "tagline": "WEAR YOUR IDENTITY.",
    "official_domain": "elevennation.shop",
    "support_email": "support@elevennation.shop",
    "support_phone": "",
    "whatsapp": "",
    "studio_address": "Dhaka, Bangladesh"
}'::jsonb, 'Official brand and store contact configuration'),

('shipping_fees', '{
    "free_shipping_threshold": 2500,
    "dhaka_delivery_fee": 70,
    "outside_dhaka_delivery_fee": 130,
    "currency": "BDT",
    "currency_symbol": "৳"
}'::jsonb, 'Bangladesh delivery rates and threshold settings'),

('order_settings', '{
    "order_prefix": "EN-",
    "invoice_prefix": "EN-INV-",
    "cod_enabled": true,
    "auto_confirm": false
}'::jsonb, 'Order processing rules and prefixes'),

('social_links', '{
    "facebook": "",
    "instagram": "",
    "tiktok": "",
    "youtube": ""
}'::jsonb, 'Official brand social media channels')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value;

-- ---------------------------------------------------------------------
-- 5. HOMEPAGE SECTIONS CONFIGURATION
-- ---------------------------------------------------------------------

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
ON CONFLICT (section_key) DO UPDATE SET
    sort_order = EXCLUDED.sort_order,
    is_visible = EXCLUDED.is_visible;

-- ---------------------------------------------------------------------
-- 6. NAVIGATION ITEMS
-- ---------------------------------------------------------------------

INSERT INTO navigation_items (label, path, menu_location, sort_order, is_active)
VALUES
('Home', '/', 'header', 1, TRUE),
('Shop', '/shop', 'header', 2, TRUE),
('Casual Wear', '/casual-clothing', 'header', 3, TRUE),
('Football Jerseys', '/football-jerseys', 'header', 4, TRUE),
('About Us', '/about', 'header', 5, TRUE)
ON CONFLICT DO NOTHING;
