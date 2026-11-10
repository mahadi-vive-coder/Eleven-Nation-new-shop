# 01 — EXISTING DATABASE ARCHITECTURE

## [DO NOT RUN — ALREADY APPLIED]
## [DO NOT RUN — FRESH INSTALL ONLY]

### Current Status
The Supabase Main Database **ALREADY EXISTS** and has been successfully initialized using this master SQL script.

---

### Authoritative File
- **Path**: `database/01_EXISTING_DATABASE/eleven_nation_final_fresh_install.sql`
- **Classification**: **A. ALREADY APPLIED — DO NOT RUN AGAIN** (and **E. FRESH INSTALL ONLY**)
- **Target Platform**: Supabase PostgreSQL 15+

---

### What This File Contains
1. **Extensions**: `uuid-ossp`, `pgcrypto`
2. **27 Tables**:
   - Identity & RBAC: `profiles`, `user_roles`, `admin_activity_logs`, `system_secrets`
   - Catalog: `categories`, `products`, `product_images`, `product_variants`, `inventory_movements`
   - Store & Theme: `store_settings`, `theme_customizations`, `banners`, `homepage_sections`
   - Customers & Orders: `customer_addresses`, `orders`, `order_items`, `order_status_history`
   - Discounts: `coupons`, `coupon_redemptions`
   - Billing & Logistics: `invoices`, `invoice_queue`, `couriers`, `courier_shipments`, `courier_dispatch_claims`, `courier_webhook_events`
   - Security: `notifications`, `guest_tracking_rate_limits`
3. **Public View**: `public_product_variants` (conceals raw warehouse inventory counts from public API clients)
4. **RPC Functions**:
   - `place_order_atomic()`: Server-authoritative checkout with atomic stock deductions and idempotency.
   - `track_guest_order()`: Rate-limited guest order verification with edge header IP resolution.
   - Courier dispatch claims: `claim_order_for_dispatch()`, `finalize_order_dispatch()`, `release_order_dispatch_claim()`.
   - Webhook processing: `process_steadfast_webhook()`.
   - Invoice queue management: `claim_invoice_queue_jobs()`, `complete_invoice_queue_job()`, `fail_invoice_queue_job()`.
   - Role verification & bootstrap: `current_user_is_super_admin()`, `current_user_is_admin()`, `current_user_has_role()`, `bootstrap_super_admin()`.
5. **Row Level Security**: Comprehensive policies for all 27 tables.

---

### Critical Warning for the User
**NEVER execute this file again in your Supabase SQL Editor on your existing database.**
- It contains `CREATE TABLE` and table configuration statements meant for initializing a brand new database.
- Executing it on your live database could conflict with existing tables, abort in error, or disrupt active configuration.
