# ELEVEN NATION — Entity Relationship (ER) Diagram

This document illustrates the core data entities and relational schema for the Eleven Nation database in Supabase.

---

## 1. Visual Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    PROFILES ||--o{ USER_ROLES : has
    PROFILES ||--o{ ADDRESSES : owns
    PROFILES ||--o{ ORDERS : places
    PROFILES ||--o{ NOTIFICATIONS : receives

    CATEGORIES ||--o{ PRODUCTS : categorizes
    PRODUCTS ||--o{ PRODUCT_IMAGES : contains
    PRODUCTS ||--o{ PRODUCT_VARIANTS : has
    
    ORDERS ||--|{ ORDER_ITEMS : includes
    ORDERS ||--o{ ORDER_STATUS_HISTORY : logs
    
    PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : ordered_as
    PRODUCT_VARIANTS ||--o{ INVENTORY_MOVEMENTS : tracks

    BANNERS {
        string id PK
        string title
        string subtitle
        string description
        string desktop_image_url
        string mobile_image_url
        string button_text
        string button_link
        string image_alt_text
        string text_alignment
        numeric overlay_opacity
        string image_position
        int sort_order
        boolean is_active
        timestamp start_at
        timestamp end_at
    }

    CATEGORIES {
        string id PK
        string name
        string slug UK
        string description
        string image_url
        int sort_order
        boolean is_active
    }

    PRODUCTS {
        string id PK
        string name
        string slug UK
        string sku UK
        string category_id FK
        numeric base_price
        numeric compare_at_price
        boolean in_stock
        boolean is_active
        boolean is_featured
        boolean is_new_arrival
        string jersey_team_name
        string jersey_season
        string jersey_league
        boolean jersey_allow_customization
        numeric jersey_customization_price
        int casual_gsm
        string casual_fit
    }

    PRODUCT_VARIANTS {
        string id PK
        string product_id FK
        string size
        string color_name
        string color_hex
        int stock
        string sku UK
        numeric price_modifier
    }

    PRODUCT_IMAGES {
        uuid id PK
        string product_id FK
        string url
        string alt
        boolean is_primary
        int sort_order
    }

    ORDERS {
        uuid id PK
        string order_number UK
        uuid user_id FK
        string customer_name
        string customer_phone
        string delivery_district
        string delivery_area
        string delivery_full_address
        numeric subtotal
        numeric delivery_charge
        numeric grand_total
        string payment_method
        string status
    }

    ORDER_ITEMS {
        uuid id PK
        uuid order_id FK
        string product_id FK
        string variant_id FK
        string product_name
        string size
        string color
        string custom_name
        string custom_number
        numeric unit_price
        int quantity
        numeric total_price
    }

    INVENTORY_MOVEMENTS {
        uuid id PK
        string variant_id FK
        uuid order_id FK
        int quantity_change
        string movement_type
    }

    SITE_SETTINGS {
        string key PK
        jsonb value
        string description
    }
```

---

## 2. Relational Key Constraints & Cardinalities

1. **`categories` 1:N `products`**:
   - `products.category_id` references `categories.id` with `ON DELETE RESTRICT`. A category cannot be deleted if active products exist under it.
2. **`products` 1:N `product_variants`**:
   - `product_variants.product_id` references `products.id` with `ON DELETE CASCADE`. Each variant represents a distinct Size + Color combination with independent stock tracking.
3. **`products` 1:N `product_images`**:
   - Multiple images per product. `is_primary` flags the main catalog card image.
4. **`orders` 1:N `order_items`**:
   - Snapshot table capturing price, product name, size, color, and customized name/number at the exact moment of order placement.
5. **`product_variants` 1:N `inventory_movements`**:
   - Audit trail capturing whenever variant stock changes (e.g. customer places COD order, order cancellation restock, admin warehouse top-up).
6. **`banners` Table**:
   - Standalone administrative entity for homepage hero rotation. Supports responsive desktop and mobile photography, visibility scheduling, sort order, and configurable dark scrim overlay.
